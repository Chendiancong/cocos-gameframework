import { CCObject, Component, Layout, Node, NodePool, Prefab, Size, UITransform, _decorator, instantiate } from "cc";
import { ResReference } from "game-framework/scripts/res/ResReference";
import { XDataCollection } from "../../data/XDataCollection";
import { aspects } from "../../Aspects";
import { DeferCenter } from "game-framework/scripts/base/promise";
import { IUIData, UIData, XUIDataComp } from "./XUIDataComp";
import { getOrAddComponent } from "../../util";
import { LoadPrefab } from "../LoadPrefab";

const { ccclass, property, requireComponent, executeInEditMode } = _decorator;

@ccclass('XLayoutView.ItemPrefab')
class ItemPrefab extends ResReference {
    @property({ type: Prefab, override: true })
    get asset() { return this._asset as Prefab }
    set asset(value: Prefab) { this._internalSetAsset(value); }
}

export interface IXLayoutData extends IUIData {
    useCustomItem?: boolean;
    customItem?: ItemPrefab;
}

@ccclass('XLayoutView.XLayoutData')
export class XLayoutData extends UIData implements IXLayoutData {
    @property
    useCustomItem: boolean = false;
    @property({ type: ItemPrefab, visible: function () { return this.useCustomItem; } })
    customItem: ItemPrefab = new ItemPrefab();
}

@ccclass('XLayoutView')
@requireComponent([Layout])
@executeInEditMode
export class XLayoutView extends Component {
    @property(ItemPrefab)
    get defaultItem() { return this._defaultItem; }
    set defaultItem(value: ItemPrefab) {
        this._defaultItem = value;
    }
    @property({ serializable: true })
    private _defaultItem: ItemPrefab = new ItemPrefab();
    @property([XLayoutData])
    get initDatas() { return this._initDatas; }
    set initDatas(value: XLayoutData[]) {
        this._initDatas = value;
        this._collection?.setDatas(value);
    }
    @property({ serializable: true })
    private _initDatas: XLayoutData[] = [];
    @property({ tooltip: '是否自动加载初始化数据' })
    autoInitial: boolean = true;
    @property
    get editorRefresh() { return false; }
    set editorRefresh(value: boolean) {
        if (aspects.checkEditor() && value) {
            this._collection.setDatas(this._initDatas);
        }
    }

    private _collection = new XDataCollection<IUIData>();
    private _defaultPool: NodePool = new NodePool();
    private _defers = new DeferCenter<void, KeysWithSuffix<XLayoutView, 'Task'>>();
    private _dataComps: XUIDataComp[] = [];

    get initialTask() { return this._defers.getPromise('initialTask'); }
    get dataCollection() { return this._collection; }

    setDatas(datas: IUIData[]) {
        this._collection.setDatas(datas);
    }

    protected onLoad() {
        this._defaultItem
            .aloadAsset()
            .then(() => this._defers.resolve('initialTask'));

        this._defers
            .getPromise('initialTask')
            .then(async () => {
                if (!this.isValid)
                    return;
                this._collection.on(XDataCollection.Events.CHANGED, this._onCollectionChanged, this);
                const curDatas = this._collection.source.concat();
                if (this.autoInitial || aspects.checkEditor()) {
                    for (const d of this.initDatas)
                        curDatas.push(d);
                }
                this._collection.setDatas(curDatas);
            });
    }

    protected onDestroy() {
        this._defaultPool.clear();
    }

    private _onCollectionChanged(changeType: number, ...args: any[]) {
        const kChangeType = XDataCollection.ChangeType;
        switch (changeType) {
            case kChangeType.RESET:
                this._onCollectionReset(args[0], args[1]);
                break;
            case kChangeType.ADD:
                this._onCollectionAdd(args[0], args[1]);
                break;
            case kChangeType.ADD_MULT:
                this._onCollectionAddMult(args[0], args[1]);
                break;
            case kChangeType.REMOVE:
                this._onCollectionRemove(args[0], args[1]);
                break;
        }
    }

    private _onCollectionReset(newDatas: ReadonlyArray<IUIData>, oldDatas: ReadonlyArray<IUIData>) {
        console.log('on collection reset');
        this._removeAllItems();
        for (let i = 0, len = newDatas.length; i < len; ++i)
            this._addItem(newDatas[i]);
    }

    private _onCollectionAdd(index: number, data: IUIData) {
        this._addItem(data, index);
    }

    private _onCollectionAddMult(startIdx: number, datas: IUIData[]) {
        for (let i = 0, len = datas.length; i < len; ++i)
            this._addItem(datas[i], startIdx + i);
    }

    private _onCollectionRemove(index: number, data: IUIData) {
        if (this._dataComps[index]?.data === data)
            this._removeItemAt(index);
    }

    private _removeItemAt(index: number) {
        if (index >= this._dataComps.length)
            return;
        const data = this._dataComps[index];
        this._dataComps = this._dataComps.splice(index, 1);
        this._removeItem(data);
    }

    private _removeAllItems() {
        const datas = this._dataComps.concat();
        this._dataComps.length = 0;
        for (const data of datas)
            this._removeItem(data);
    }

    private _removeItem(dataComp: XUIDataComp) {
        if (dataComp?.isValid) {
            const innerData = dataComp.getData<XLayoutData>();
            if (innerData.useCustomItem && dataComp.getComponent(LoadPrefab))
                dataComp.node.destroy();
            else
                this._defaultPool.put(dataComp.node);
        }
    }

    private _addItem(data: IUIData, index: number = -1) {
        let dataComp: XUIDataComp;
        const isEditor = aspects.checkEditor();
        const _data: IXLayoutData = data;
        if (_data.useCustomItem && _data.customItem) {
            _data.customItem.loadAsset();
            const newNode = new Node('CustomItem');
            const transform = newNode.addComponent(UITransform);
            transform.setContentSize(new Size(1, 1));
            const loadPrefab = newNode.addComponent(LoadPrefab);
            loadPrefab['_uuid'] = _data.customItem.assetUuid;
            loadPrefab.isFullSize = true;
            dataComp = newNode.addComponent(XUIDataComp);
        } else if (this._defaultPool.size() > 0) {
            const newNode = this._defaultPool.get();
            dataComp = getOrAddComponent(newNode, XUIDataComp);
        } else {
            const newNode = instantiate(this.defaultItem.asset);
            getOrAddComponent(newNode, UITransform);
            dataComp = getOrAddComponent(newNode, XUIDataComp);
        }
        if (isEditor)
            dataComp.node._objFlags |= CCObject.Flags.DontSave|CCObject.Flags.LockedInEditor;
        dataComp.node.parent = this.node;
        dataComp.node.walk(v => v.layer = this.node.layer);
        this._dataComps.push(dataComp);
        if (index >= 0 && index !== this._dataComps.length - 1) {
            const temp = this._dataComps[index];
            this._dataComps[index] = dataComp;
            this._dataComps[this._dataComps.length - 1] = temp;
            dataComp.node.setSiblingIndex(index);
        }
        dataComp.data = data;
        return dataComp;
    }
}