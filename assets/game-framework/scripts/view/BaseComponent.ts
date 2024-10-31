import * as fgui from 'fairygui-cc';
import { Component, js, _decorator, Node } from "cc";
import { applyMixins } from "../base/jsUtil";
import { ObserverClass } from "../events/ObserverClass";
import { fGetChild } from '../utils/fgui/futil';
import { getOrAddComponent } from '../utils/util';
import { BaseComponentStart } from './BaseComponentStart';
import { FPackage } from './FPackage';
import { CustomEvent } from '../events/Event';
import { NodeBatchable } from '../engine';
import { ResKeeper } from '../res/ResKeeper';
import { getGlobal } from '../base/base';

const { ccclass, property } = _decorator;

export type ComponentData<T extends BaseComponent> = T extends BaseComponent<infer R> ? R : any;

@ccclass('BaseComponent')
export class BaseComponent<T = any> extends Component {
    _observed: any[] = [];
    _closed: boolean = false;
    private _dataDummy: boolean;

    get fobj(): fgui.GObject {
        return this.node && this.node["$gobj"];
    }
    get fcom(): fgui.GComponent {
        return this.node && this.node["$gobj"];
    }

    getChild(name: string) {
        return fGetChild(this.fcom, name);
    }

    private _conditionIds: number[];
    protected checkCondition?(id: number, bShowTips?: boolean): boolean {
        if (id) {
            if (!this._conditionIds) this._conditionIds = [];
            if (!this._conditionIds.includes(id)) {
                this._conditionIds.push(id);
            }
        }
        return window["checkCondition"]?.(id, bShowTips);
    }

    protected get conditionIds() {
        return this._conditionIds;
    }

    open?(params?: any): void;

    close?(): void;

    reconnect?(): void;

    protected _data?: T;
    public get data(): T {
        return this._data;
    }
    public set data(v: T) {
        this._data = v;
        this._internalDataChanged(v);
    }

    private _selected: boolean;
    public get selected(): boolean {
        return this._selected;
    }
    public set selected(v: boolean) {
        if (this._selected === v) {
            return;
        }
        this._selected = v;
        if (this.node.isValid) {
            this.selectChanged(v);
        }
    }

    private _propsInited: boolean = false;
    public get propsInited() { return this._propsInited; }

    private _dataChanged(data: any): void {
        this.data = data;
    }

    private _onItemSelect(selected: boolean): void {
        this.selected = selected;
    }

    private _internalDataChanged(data: any) {
        if (!this._propsInited)
            this._dataDummy = true;
        else {
            this._dataDummy = false;
            this.dataChanged(data);
        }
    }

    protected selectChanged(selected: boolean): void { }

    protected dataChanged(data: any): void { }

    protected get observeWhenEnable() { return true; }

    get myObserveWhenEnable() { return this.observeWhenEnable; }

    static initProp<T extends BaseComponent>(instance: T, clazz: Constructor<T>) {
        if (instance._propsInited)
            return;

        instance._propsInited = true;
        instance.node.on(CustomEvent.DATA_CHANGE, instance._dataChanged, instance);
        instance.node.on(CustomEvent.ITEM_SELECT, instance._onItemSelect, instance);

        let fcom: fgui.GComponent;
        if (!(fcom = instance.fcom))
            return;

        if (!clazz)
            return;

        const fprops = clazz['_fprops'] as Record<string, IFProp>;
        if (!fprops || !(fcom instanceof fgui.GComponent))
            return;

        let pkgId: string, itemId: string;
        if (fcom.packageItem) {
            let pkgItem = fcom.packageItem.getBranch();
            pkgId = pkgItem.owner.id;
            itemId = pkgItem.id;
        }

        const option: FPropHandleOption = {
            instance,
            fcom,
            fchild: void 0,
            fprop: void 0,
            propName: '',
            ccNode: instance.node
        }
        for (const pname in fprops) {
            const fprop = fprops[pname];
            option.fprop = fprop;
            option.propName = pname;
            option.fchild = void 0;
            FPropUtil.initHelper(option);
        }
    }

    __preload() {
        this.legacyInitProp(this);
        if (this.observeWhenEnable) {
            this._observerModleFun();
        }
        if (this._dataDummy)
            this._internalDataChanged(this._data);
        this.onLoad = new Proxy(
            this.onLoad ?? function () { },
            {
                apply(target: BaseComponent['onLoad'], thisArg: BaseComponent, args: any[]) {
                    target.call(thisArg, ...args);
                    thisArg._internalOnLoad.call(thisArg, ...args);
                }
            }
        )
    }

    private _internalOnLoad() {
        this.node.emit(CustomEvent.COMPONENT_ONLOAD);
    }

    private _enableCallFunOnceDic: { [functionName: string]: { func: Function, args: any } } = {};
    private _enableCallFunDic: { [functionName: string]: { func: Function, args: any } } = {};
    addEnableApplyOnce(func: Function, args: any) {
        if (!this.myObserveWhenEnable) return;
        let newArs = Object.create({ isValid: true });
        Object.assign(newArs, args);
        this._enableCallFunOnceDic[js.getClassName(func)] = { func, args: newArs };
    }

    addEnableApply(func: Function, args: any) {
        if (!this.myObserveWhenEnable) return;
        let newArs = Object.create({ isValid: true });
        Object.assign(newArs, args);
        this._enableCallFunDic[js.getClassName(func)] = { func, args: newArs };
    }

    private _observerModleFun() {
        this.fcom.observerModleEnable = () => {
            if (this.node.isValid) {
                Object.keys(this._enableCallFunOnceDic).forEach(functionName => {
                    let enableCallFunOnceObj = this._enableCallFunOnceDic[functionName];
                    if (!!enableCallFunOnceObj) {
                        let results: any[] = [];
                        Object.keys(enableCallFunOnceObj.args).forEach(key => {
                            results.push(enableCallFunOnceObj.args[key]);
                        });
                        enableCallFunOnceObj.func.call(this, ...results);
                    }
                }, this);
                Object.keys(this._enableCallFunDic).forEach(functionName => {
                    let enableCallFunObj = this._enableCallFunDic[functionName];
                    if (!!enableCallFunObj) {
                        let results: any[] = [];
                        Object.keys(enableCallFunObj.args).forEach(key => {
                            results.push(enableCallFunObj.args[key]);
                        });
                        enableCallFunObj.func.call(this, ...results);
                    }
                }, this);
            }
            this._enableCallFunOnceDic = {};
        }
    }

    protected onDispose() { }

    /**
     * 移除监听，做清理工作
     * @param {Boolean} destroy 是否销毁节点 默认销毁
     * */
    dispose(destroy: boolean = true): void {
        this._closed = true;
        this._enableCallFunOnceDic = {};
        this._enableCallFunDic = {};
        this.onDispose();
        this.removeObserves();
        if (destroy) {
            this.fcom?.dispose();
        }
    }

    getParentBaseComponent() {
        let self = this;
        let selfNode = self.node;
        do {
            selfNode = selfNode.parent;
            let baseComponent = selfNode && selfNode.getComponent(BaseComponent);
            if (baseComponent) {
                return baseComponent;
            }
        } while (selfNode);
    }

    getParentBaseWin<T extends import("./BaseWin").BaseWin>(): T {
        let self = this;
        let selfNode = self.node;
        do {
            selfNode = selfNode.parent;
            let baseWin: T = <any>(
                (selfNode && selfNode.getComponent("BaseWin"))
            );
            if (baseWin) {
                return baseWin;
            }
        } while (selfNode);
    }

    isClose() {
        return this._closed;
    }

    get visible() {
        return this.isVisible();
    }

    set visible(val: boolean) {
        this.setVisible(val);
    }

    isVisible() {
        return this.fcom.visible;
    }

    setVisible(value: boolean) {
        this.fcom.visible = value;
    }

    closePopup: () => void;

    /**
     * @deprecated legacy
     */
    legacyInitProp(instance: BaseComponent = this, clazz = js.getClassByName(js.getClassName(this))) {
        if (instance._propsInited)
            return;

        instance._propsInited = true;
        instance.node.on(CustomEvent.DATA_CHANGE, instance._dataChanged, instance);
        instance.node.on(CustomEvent.ITEM_SELECT, instance._onItemSelect, instance);

        let fcom: fgui.GComponent;
        if (!(fcom = instance.fcom))
            return;

        if (!clazz)
            return;

        const fprops = clazz["_fprops"];
        if (!fprops || !(fcom instanceof fgui.GComponent))
            return;

        let pkgId: string, itemId: string;
        if (fcom.packageItem) {
            let pkgItem = fcom.packageItem.getBranch();
            pkgId = pkgItem.owner.id;
            itemId = pkgItem.id;
        }

        let type: any;
        for (let pname in fprops) {
            let fprop: IFProp = fprops[pname];

            if (fprop.ctrl) {
                instance[pname] = fcom.getController(fprop.name);
                continue;
            }

            if (fprop.anim) {
                instance[pname] = fcom.getTransition(fprop.name);
                continue;
            }

            if (fprop.exist && !fprop.exist.get(pkgId, itemId)) {
                continue;
            }

            let fchild: fgui.GObject;
            if (!!fprop.names) { // 按名字列表获取属性
                fchild = fcom.getChildByNames(fprop.names);
            }

            if (!fchild) { // 递归获取属性
                fchild = fGetChild(fcom, fprop.name);
                if (fchild) { // 记录属性名字列表
                    let tempChild = fchild;
                    let names = fprop.names = [];
                    do {
                        names.push(tempChild.name);

                        tempChild = tempChild.parent;
                    } while (tempChild !== fcom);

                    names.reverse();
                }
            }

            if (fprop.exist) { // 记录属性在组件中的存在性
                fprop.exist.set(pkgId, itemId, fchild ? 1 : 0);
            }

            if (!fchild) {
                if (fprop.required !== false)
                    console.error();
                (`can not found ${fprop.path || fprop.name} at ${js.getClassName(clazz)}`);
                continue;
            }

            let comp: any;
            type = fprop.type;
            if (!!type) {
                fchild.ccRenderer = type;
                comp = fchild.ccRender;
                let params = fprop.params;
                if (!!params) {
                    Object.keys(params).forEach(key => {
                        comp[key] = params[key];
                    })
                }
            } else {
                comp = fchild;
            }

            if (comp.node instanceof Node)
                comp.node.name = pname;
            instance[pname] = comp;

            if (!!fprop.batch) {
                let node = fchild.node;
                if (fchild instanceof fgui.GList) {
                    node = fchild._container;
                }
                if (node) getOrAddComponent(node, NodeBatchable);
                ///if (node) setBatch(node);
            }

            if (!!fprop.preventBatch) {
                let node = fchild.node;
                NodeBatchable.setPreventBatchNode(node);
            }

            if (fprop.loader && (fchild instanceof fgui.GLoader)) {
                let loader = fprop.loader;
                let renderer = loader.type;
                let packageName = loader.packageName;
                let viewName = loader.viewName;
                fchild.componentTouch = true;
                fchild.componentRender = true;
                fchild.ccRenderer = renderer;
                if (packageName && viewName) {
                    if (fgui.UIPackage.getByName(packageName)) {
                        ResKeeper.register(
                            fchild.node,
                            fgui.UIPackage.getByName(packageName),
                            getOrAddComponent(fchild.node, ResKeeper)
                        )
                        fchild.url = gFramework.viewMgr.getItemURL(packageName, viewName);
                    }
                    else {
                        let pkg = getOrAddComponent(fchild.node, FPackage);
                        pkg.packageName = packageName;
                        pkg.node.once(FPackage.EventType.loaded, function () {
                            (fchild as fgui.GLoader).url = gFramework.viewMgr.getItemURL(packageName, viewName);
                        }, instance);
                    }
                }
                if (!!fprop.comp) {
                    for (let e of fprop.comp) {
                        if (e.loader)
                            fchild.addContentRenderer(e.comp, e.params);
                        else
                            fchild.addRenderer(e.comp, e.params);
                    }
                }
            } else {
                if (!!fprop.comp) {
                    for (let e of fprop.comp) {
                        if (fchild instanceof fgui.GComponent && fchild.isJobConstruct)
                            fchild.addAsyncComponentRenderer(e.comp, e.params);
                        else
                            fchild.addRenderer(e.comp, e.params);
                    }
                }

                if ((fprop.virtual || fprop.itemRenderer) && fchild instanceof fgui.GList) {
                    if (fprop.virtual) fchild.setVirtual();
                    if (fprop.itemRenderer) fchild.ccItemRenderer = fprop.itemRenderer;
                }

                if (!!fprop.initHandle) {
                    getOrAddComponent(instance, BaseComponentStart).initHandlers.push(fprop.initHandle.bind(null, fchild, fprop));
                }
            }
        }
    }
}
export interface BaseComponent extends ObserverClass { }

applyMixins(BaseComponent, [ObserverClass]);

getGlobal().BaseComponent = BaseComponent;

export type FPropHandleOption<TChild extends fgui.GObject = fgui.GObject> = {
    readonly instance: any,
    readonly fcom: fgui.GComponent,
    fchild: TChild,
    fprop: IFProp,
    propName: string,
    readonly ccNode: Node;
}

export class FPropUtil {
    static fctrl({ instance, propName, fcom }: FPropHandleOption) {
        instance[propName] = fcom.getController(propName);
    }

    static fanim({ instance, propName, fcom }: FPropHandleOption) {
        instance[propName] = fcom.getTransition(propName);
    }

    static ftype({ instance, fprop, fchild, propName }: FPropHandleOption) {
        const type = fprop.type;
        fchild.ccRenderer = type;
        const comp = fchild.ccRender;

        const params = fprop.params;
        if (!!params)
            Object.keys(params)
                .forEach(key => comp[key] = params[key]);

        comp.node.name = propName;
        instance[propName] = comp;
    }

    static fprop({ instance, fchild, propName }: FPropHandleOption) {
        fchild.node.name = propName;
        instance[propName] = fchild;
    }

    static fbatch({ fchild }: FPropHandleOption) {
        let node = fchild.node;
        if (fchild instanceof fgui.GList)
            node = fchild._container;
        if (node?.isValid)
            getOrAddComponent(node, NodeBatchable);
    }

    static fpreventBatch({ fchild }: FPropHandleOption) {
        const node = fchild.node;
        NodeBatchable.setPreventBatchNode(node);
    }

    static floader({ fprop, fchild: _fchild, instance }: FPropHandleOption) {
        const loader = fprop.loader;
        const renderer = loader.type;
        const packageName = loader.packageName;
        const viewName = loader.viewName;
        const fchild = _fchild as fgui.GLoader;
        fchild.componentTouch = true;
        fchild.componentRender = true;
        fchild.ccRenderer = renderer;
        if (packageName && viewName) {
            if (fgui.UIPackage.getByName(packageName)) {
                ResKeeper.register(
                    fchild.node,
                    fgui.UIPackage.getByName(packageName)
                );
                fchild.url = gFramework.viewMgr.getItemURL(packageName, viewName);
            } else {
                const pkg = getOrAddComponent(fchild.node, FPackage);
                pkg.packageName = packageName;
                pkg.node.once(
                    FPackage.EventType.loaded,
                    function () {
                        (fchild as fgui.GLoader).url = gFramework.viewMgr.getItemURL(packageName, viewName);
                    },
                    instance
                );
            }
        }
    }

    static fcomp({ fchild, fprop }: FPropHandleOption) {
        const isLoader = fchild instanceof fgui.GLoader;
        const isJobConstruct = fchild instanceof fgui.GComponent && fchild.isJobConstruct;
        for (const e of fprop.comp) {
            if (isLoader)
                (fchild as fgui.GLoader).addContentRenderer(e.comp, e.params);
            else if (isJobConstruct)
                (fchild as fgui.GComponent).addAsyncComponentRenderer(e.comp, e.params);
            else
                fchild.addRenderer(e.comp, e.params);
        }
    }

    static fvirtual({ fchild }: FPropHandleOption<fgui.GList>) {
        fchild.setVirtual();
    }

    static flistRenderer({ fchild, fprop }: FPropHandleOption<fgui.GList>) {
        fchild.ccItemRenderer = fprop.itemRenderer;
    }

    static initHandle({ fchild, fprop, ccNode }: FPropHandleOption) {
        getOrAddComponent(ccNode, BaseComponentStart)
            .initHandlers
                .push(fprop.initHandle.bind(void 0, fchild, fprop));
    }

    static findChild({ instance, fprop, fcom }: Omit<FPropHandleOption, 'fchild'>) {
        let fchild: fgui.GObject;

        if (!!fprop.names) {
            // 按名字列表获取属性
            fchild = fcom.getChildByNames(fprop.names);
        }

        if (!fchild) {
            // 递归获取属性
            fchild = fGetChild(fcom, fprop.name);
            if (fchild) {
                // 记录属性名字列表
                let tempChild = fchild;
                const names = fprop.names = [];
                do {
                    names.push(tempChild.name);
                    tempChild = tempChild.parent;
                } while (tempChild !== fcom);

                names.reverse();
            }
        }

        if (!fchild) {
            if (fprop.required !== false)
                console.error(`can not found ${fprop.path || fprop.name} at ${js.getClassName(instance)}`);
        }

        return fchild;
    }

    static initHelper(option: FPropHandleOption) {
        const fprop = option.fprop;
        do {
            if (fprop.ctrl) {
                this.fctrl(option);
                break;
            }

            if (fprop.anim) {
                this.fanim(option);
                break;
            }

            option.fchild = this.findChild(option);

            if (fprop.type)
                this.ftype(option);
            else
                this.fprop(option);

            if (fprop.batch)
                this.fbatch(option);
            if (fprop.preventBatch)
                this.fpreventBatch(option);

            if (fprop.loader && (option.fchild instanceof fgui.GLoader))
                this.floader(option);
            if (fprop.comp)
                this.fcomp(option);

            if (option.fchild instanceof fgui.GList) {
                const _option = option as FPropHandleOption<fgui.GList>;
                if (fprop.virtual)
                    this.fvirtual(_option);
                if (fprop.itemRenderer)
                    this.flistRenderer(_option);
            }

            if (fprop.initHandle)
                this.initHandle(option);
        } while (false);
    }
}