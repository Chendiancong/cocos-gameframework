import { _decorator, Component, Node, Prefab, isValid, instantiate, CCObject, UITransform, UIOpacity, macro, Widget } from 'cc';
import { ResKeeper } from '../../res/ResKeeper';
import { ResMgr } from '../../res/ResMgr';
import { aspects } from '../Aspects';
import { Lerper } from '../Lerper';
import { getOrAddComponent } from '../util';
import { gameTime } from '../time/GameTime';
const { ccclass, property, executeInEditMode } = _decorator;
const { checkEditor } = aspects;

@ccclass('LoadPrefab')
@executeInEditMode
export class LoadPrefab extends Component {
    static readonly EventType = {
        LOADED: 'loaded'
    };

    private _prefab: Prefab = null;
    @property({ type: Prefab })
    get prefab() { return this._prefab; }
    set prefab(value: Prefab) {
        if (this._uuid === value?.uuid)
            return;
        if (isValid(value))
            this._uuid = value.uuid;
        else
            this._uuid = '';
        this._onPrefabChange(value);
        this._instantiatePrefab();
    }
    @property({ serializable: true, visible: true, readonly: true })
    private _uuid: string = '';
    @property({ tooltip: '是否自动铺满容器' })
    isFullSize: boolean = true;

    @property({ displayName: '加载完成的时候渐显', visible: true, serializable: true})
    private _fadeInWhenLoaded: boolean = false;

    private _targetNode: Node;

    onLoad() {
        if (checkEditor())
            this._watchSceneChange();
        else
            this._checkFadeInWhenLoaded();

        this._loadPrefabByUuid();
    }

    private _watchSceneChange() {
        //@ts-ignore
        // cce.Scene.on('save', _ => this._setupTargetProperty());
    }

    private _checkFadeInWhenLoaded() {
        if (this._fadeInWhenLoaded) {
            const opacity = getOrAddComponent(this.node, UIOpacity);
            opacity.opacity = 0;
            this.node.once(
                LoadPrefab.EventType.LOADED,
                () => {
                    let lerper = new Lerper()
                        .setStartValue(opacity.opacity)
                        .setEndValue(255)
                        .setDuration(700)
                        .setLimited(true)
                        .start();
                    let func = () => {
                        lerper.delta(gameTime.deltaTimeMs);
                        opacity.opacity = lerper.curValue;
                        if (!lerper.isRunning)
                            this.unschedule(func);
                    }
                    this.schedule(func, 0, macro.REPEAT_FOREVER);
                }
            );
        }
    }

    private _resKeeper: ResKeeper;
    private _onPrefabChange(cur: Prefab) {
        if (!checkEditor()) {
            // 非编辑器模式下加入资源管理
            if (isValid(cur))
                this._resKeeper = ResKeeper.register(this.node, cur, this._resKeeper);
        }
        this._prefab = cur;
    }

    async _loadPrefabByUuid() {
        if (!this._uuid)
            return;
        const prefab = await ResMgr.loadUuid<Prefab>(this._uuid);

        this._onPrefabChange(prefab);
        this._instantiatePrefab();

        this.node.emit(LoadPrefab.EventType.LOADED);
    }

    private _instantiatePrefab() {
        if (!isValid(this._prefab))
            return;
        const node = this._targetNode = instantiate(this._prefab);
        node.parent = this.node;

        this._fullSize();

        if (checkEditor())
            this._dontSaveNode(node);
    }

    private _fullSize() {
        if (!this._targetNode?.isValid || !this.isFullSize)
            return;
        const thisTransform = this.getComponent(UITransform);
        const nodeTransform = this._targetNode.getComponent(UITransform);
        if (thisTransform?.isValid && nodeTransform?.isValid) {
            if (checkEditor())
                // 编辑模式下将容器与实例化的节点对齐
                thisTransform.setContentSize(nodeTransform.contentSize);
            const widget = getOrAddComponent(this._targetNode, Widget);
            widget.isAlignLeft = widget.isAlignRight = widget.isAlignTop = widget.isAlignBottom = true;
            widget.left = widget.right = widget.top = widget.bottom = 0;
            widget.alignMode = Widget.AlignMode.ALWAYS;
        }
    }

    private _dontSaveNode(node: Node) {
        const Flags = CCObject.Flags;
        node._objFlags |= Flags.DontSave;
    }
}