import { UILayer } from "./LayerMgr";
import { EventTarget, Rect, js } from "cc";
import { BaseWin, IBaseWin } from "./BaseWin";
import { BaseComponent } from "./BaseComponent";
import { createViewCtrl, ViewCtrl } from "./ViewCtrl";
import { CustomEvent } from "../events/Event";
import { DEBUG } from "cc/env";
import { GComponent, GObject, GObjectPool, GRoot, RelationType, UIPackage } from "fairygui-cc";
import { ITimerHandler, timerCenter } from "../timer/TimerCenter";
import type { FScriptComponent } from "./FScript";

const _offWidth: number = 80;
const _offHight: number = 160;

type OpenKey = number | string | IBaseWin | Constructor<IBaseWin>;
type CtrlKey = string | IBaseWin;
type WinOpenParams<T extends IBaseWin> = T extends { open(params: infer R) } ? R : any;

export class ViewBuilder {
    openKey: string;
    ctrlKey: string;
    sourceCtrlKey: string;
    info: IViewRegisterInfo;
    widgets: Constructor<BaseComponent>[];

    setLayer(layer: UILayer) {
        this.info.layer = layer;
        return this;
    }

    setCtrlKey(value: string) {
        if (value) this.ctrlKey = value;
        return this;
    }

    setSource(source: BaseComponent) {
        // if (!source) {
        //     this.sourceCtrlKey = null;
        //     return this;
        // }
        // if (!(source instanceof BaseWin)) {
        //     source = source.getParentBaseWin();
        // }
        // this.info.layer = (source as BaseWin).viewCtrl.layer;
        // this.sourceCtrlKey = (source as BaseWin).ctrlKey;
        // return this;
        throw new Error();
    }

    setClickout(value: boolean) {
        this.info.clickout = value;
        return this;
    }

    open(params?: any, fromKey?: string) {
        const viewMgr = gFramework.viewMgr;
        let ctrl: ViewCtrl;
        if (!(ctrl = viewMgr.getViewCtrl(this.ctrlKey))) {
            ctrl = createViewCtrl(this);
            ctrl.node.on(ViewCtrl.EventType.open, viewMgr._onOpen, viewMgr);
            ctrl.node.on(ViewCtrl.EventType.close, viewMgr._onClose, viewMgr);
            ctrl.node.on(ViewCtrl.EventType.loaded, viewMgr._onLoad, viewMgr);
        };
        ctrl.fromKey = fromKey;
        ctrl.setParam(params);
        return ctrl.open();
    }
}

export class ViewMgr extends EventTarget {
    public mask: GComponent;
    public wait: GComponent;
    readonly kPoolItemKey = '$gPoolItem';

    private static _regInfo: { [key: string]: IViewRegisterInfo } = {};
    private static _idKeyMap: { [index: number]: string } = {};
    private static _commonWidgets: Constructor<BaseComponent>[] = [];

    private _ctrlMap: { [ctrlKey: string]: ViewCtrl } = Object.create(null);
    private _ctrlStack: ViewCtrl[] = [];

    public getStack() {
        return this._ctrlStack;
    }

    public getStackIndex(ctrlKey: string): number;
    public getStackIndex(openKey: OpenKey): number;
    public getStackIndex(key: any): number {
        let stack = this._ctrlStack;
        if (key instanceof BaseWin) {
            for (let i = stack.length - 1; i >= 0; i--) {
                if (stack[i].view === key) return i;
            }
        } else {
            key = this.ctrlKeyOf(key);
            for (let i = stack.length - 1; i >= 0; i--) {
                if (stack[i].ctrlKey == key) return i;
            }
        }
        return -1;
    }

    ctrlKeyOf(key: CtrlKey): string {
        if (typeof key === "number") {
            key = ViewMgr._idKeyMap[key];
        } else if (typeof key === "function") {
            key = js.getClassName(key);
        } else if (typeof key === "object") {
            return key.ctrlKey;
        }
        return key;
    }

    openKeyOf(key: OpenKey): string {
        if (typeof key === "number") {
            key = ViewMgr._idKeyMap[key];
        } else if (typeof key === "function") {
            key = js.getClassName(key);
        } else if (typeof key === "object") {
            return key.openKey;
        }
        return key;
    }

    public getView<T extends IBaseWin>(ctor: Constructor<T>): T;
    public getView(ctrlKey: string): IBaseWin;
    public getView(openKey: OpenKey): IBaseWin;
    public getView(key: any): IBaseWin {
        return this.getViewCtrl(key)?.view;
    }

    public getViewCtrl(ctrlKey: string): ViewCtrl;
    public getViewCtrl(openKey: OpenKey): ViewCtrl;
    public getViewCtrl(key: any) {
        return this._ctrlMap[this.ctrlKeyOf(key)];
    }

    public getTopViewCtrl(i?: number, border = false): ViewCtrl {
        let stack = this._ctrlStack;
        i = i ?? stack.length - 1;
        while (i >= 0 && (
            !stack[i].visible ||
            (!border && stack[i].border)
            || stack[i].maskIgnore
        )) i--;
        return i >= 0 ? stack[i] : null;
    }

    public canShow(openKey: OpenKey, params?: any, showTips: boolean = false): boolean {
        let res: boolean = true;
        let info = ViewMgr._regInfo[this.openKeyOf(openKey)];
        if (info != void 0 && typeof info.clazz["checkOpen"] === "function") {
            res = info.clazz["checkOpen"](params, showTips);
        }
        if (res == undefined) res = true;
        return res;
    }

    public static reg(params: IViewRegisterInfo) {
        if (params.id) {
            this._idKeyMap[params.id] = params.className;
        }
        this._regInfo[params.className] = params;
    }

    public static regCommonWidget<T extends BaseComponent>(comp: Constructor<T>) {
        if (this._commonWidgets.indexOf(comp) == -1) {
            this._commonWidgets.push(comp);
        }
    }

    public setMask(mask: GComponent) {
        if (this.mask != null) {
            this.mask.dispose();
        }
        mask.node.name = "mask";
        mask.opaque = true;
        mask.onClick(() => {
            if (this.tweening) {
                if (DEBUG) {
                    const top = this.getTopViewCtrl();
                    console.log("reject too fast to close the " + top.view.clazz.name + " UI");
                }
                return;
            }
            const top = this.getTopViewCtrl();
            if (!top || !top.clickout) {
                return;
            }

            if (top.loaded && top.view)
                top.view.closeSelf();
            else
                top.close();
        });
        mask.addRelation(GRoot.inst, RelationType.Size);
        this.mask = mask;
    }

    public isOpen(ctrlKey: string): boolean;
    public isOpen(openKey: OpenKey): boolean;
    public isOpen(key: any): boolean {
        return !!this.getViewCtrl(key);
    }

    private _tweening: boolean = false;
    setTweening(is: boolean) {
        this._tweening = is;
    }

    get tweening() {
        return this._tweening;
    }

    /**
     * 比较两个视图的优先级
     * @param view1 
     * @param view2 
     */
    public compare(view1: ViewCtrl, view2: ViewCtrl): number {
        let a: any,
            b: any;
        a = view1.ctrlKey;
        b = view2.ctrlKey;
        if ((a.name ?? a) == (b.name ?? b)) return 0;//TODO
        let av = (view1.info.viewName == "NetLostWaitUI" || view1.info.viewName == "NormalWaitUI") ? 0 : this.getStackIndex(a);
        let bv = (view2.info.viewName == "NetLostWaitUI" || view2.info.viewName == "NormalWaitUI") ? 0 : this.getStackIndex(b);
        return av - bv;
    }


    public hasTopView(): boolean {
        return !!this.getTopViewCtrl();
    }

    public make(openKey: OpenKey) {
        let key = this.openKeyOf(openKey);
        let regInfo = ViewMgr._regInfo[key];
        if (!regInfo) return;
        let builder: ViewBuilder;
        builder = new ViewBuilder();
        builder.openKey = key;
        builder.ctrlKey = key;
        builder.info = Object.create(regInfo);
        builder.widgets = ViewMgr._commonWidgets;
        return builder;
    }

    public openx<T extends IBaseWin>(ctor: Constructor<T>, params?: WinOpenParams<T>, fromKey?: string): Promise<T> {
        return this.open(ctor, params, fromKey);
    }

    public open<T extends IBaseWin>(ctor: Constructor<T>, params?: WinOpenParams<T>, fromKey?: string): Promise<T>;
    public open<T extends IBaseWin>(instance: T, params?: any, fromKey?: string): Promise<T>;
    public open<T extends IBaseWin>(className: string, params?: any, fromKey?: string): Promise<T>;
    public open<T extends IBaseWin>(viewId: number, params?: any, fromKey?: string): Promise<T>;
    public open<T extends IBaseWin>(openKey: OpenKey, params?: any, fromKey?: string): Promise<T>;
    public open<T extends IBaseWin = IBaseWin>(openKey: any, params?: any, fromKey?: string): Promise<T> {
        if (!this.canShow(openKey, params, true)) {
            return Promise.resolve(null);
        }
        let viewCtr = this.make(openKey)?.open(params, fromKey);
        if (!viewCtr) return Promise.reject(null);
        return viewCtr.aview as Promise<T>;
    }

    public close(ctrlKey: string): void;
    public close<T extends IBaseWin>(ctor: Constructor<T>): void;
    public close(openKey: OpenKey): void;
    public close(key: any) {
        key = this.ctrlKeyOf(key);
        let ctrl = this._ctrlMap[key];
        if (!!ctrl) {
            ctrl.close();
        }
    }

    getPopWindowLayers() {
        return [UILayer.UI_PopWindow_Low, UILayer.UI_PopWindow, UILayer.UI_PopWindow_Top];
    }

    showModal(gapMis: number) {
        ///@ts-ignore
        this.getView("NormalWaitUI")?.showModal(gapMis);
    }

    hideModal() {
        ///@ts-ignore
        this.getView("NormalWaitUI")?.hideModal();
    }

    public closePopWindow() {
        let stack = this._ctrlStack;
        let ctrl: ViewCtrl, layer: number;
        for (let i = stack.length; i--;) {
            ctrl = stack[i];
            layer = ctrl.layer;
            if (this.getPopWindowLayers().includes(layer)) {
                ctrl.close();
            }
        }
        CustomEvent.emit(this, CustomEvent.CLOSE_POP);
    }

    public closeAll() {
        let stack = this._ctrlStack;
        let i = stack.length;
        while (i--) {
            stack[i].close();
        }
        CustomEvent.emit(this, CustomEvent.CLOSE_POP);
    }

    _onOpen(ctrl: ViewCtrl) {
        this._ctrlMap[ctrl.ctrlKey] = ctrl;
        this._pushView(ctrl);
        CustomEvent.emit(this, CustomEvent.OPEN, ctrl);
        if (ctrl.loaded) {
            Promise.resolve().then(() => {
                if (ctrl.loaded)
                    this._onLoad(ctrl);
            });
        }
    }

    _onClose(ctrl: ViewCtrl) {
        this._ctrlMap[ctrl.ctrlKey] = null;
        this._popView(ctrl);
        this._updateVisible(null, ctrl);
        this._updateMask();
        CustomEvent.emit(this, CustomEvent.CLOSE, ctrl);
    }

    private _timer: ITimerHandler;
    _onLoad(ctrl: ViewCtrl) {
        if (!!this._timer) timerCenter.removeObjSchedule(this);
        if (ctrl.sizeMode !== kUiSize.mixFull) {
            this._updateVisible(ctrl, null);
            this._updateMask();
        } else {
            this._timer = timerCenter.doDelay(300, () => {
                if (ctrl && ctrl.isValid) {
                    this._updateVisible(ctrl, null);
                }
                this._timer = void 0;
            }, this);
        }
        CustomEvent.emit(this, CustomEvent.LOAD, ctrl);
    }

    private _pushView(ctrl: ViewCtrl) {
        let stack = this._ctrlStack;
        let index = stack.indexOf(ctrl);
        if (index >= 0) {
            stack.splice(index, 1);
        }

        stack.push(ctrl);

        let i = stack.length - 1;
        let prev: ViewCtrl;
        while (i) {
            prev = stack[i - 1];
            if (prev.layer > ctrl.layer) {
                stack[i] = stack[i - 1];
                i--;
            } else {
                break;
            }
        }

        stack[i] = ctrl;
    }

    private _popView(ctrl: ViewCtrl) {
        js.array.remove(this._ctrlStack, ctrl);
    }

    private _updateMask() {
        let mask = this.mask;
        if (!mask) return;
        mask.removeFromParent();

        let ctrl = this.getTopViewCtrl();
        if (!ctrl || ctrl.mask === false) return;
        let layer = ctrl.fcom.parent;
        let index = layer.getChildIndex(ctrl.fcom);
        mask.makeFullScreen();
        mask.y = -gFramework.layerMgr.offsetSize;
        layer.addChildAt(mask, index);

        let maskAlpha: number = 0;
        let stack = this._ctrlStack;
        let i = stack.indexOf(ctrl);
        while (i >= 0) {
            ctrl = stack[i--];
            if (!ctrl.visible || ctrl.border) continue;
            maskAlpha = Math.max(maskAlpha, ctrl.mask);
        }

        mask.alpha = maskAlpha;
    }

    private getLayerTopViewCtrl(layer: UILayer): ViewCtrl {
        let stack = this._ctrlStack;
        let i = stack.length - 1;
        while (i >= 0 && (
            stack[i].layer !== layer ||
            stack[i].border
            || stack[i].maskIgnore
        )) i--;
        return i >= 0 ? stack[i] : null;
    }


    private _updateVisible(open: ViewCtrl, closed: ViewCtrl) {
        const closeName = !open && closed?.className;
        const updated = open || closed;
        if (!!updated && !updated.border) {
            let top = this.getLayerTopViewCtrl(updated.layer);
            if (!top || !top.loaded) {
                this._rect.set(0, 0, 1, 1);
                return;
            }
            top.show();
            if (top.layer != UILayer.UI_Main) {
                const stacks = this._ctrlStack.filter(ctrl => {
                    return ctrl.layer === updated.layer;
                });
                this._rect.set(0, 0, 1, 1);
                if (!!closeName && closeName != top.className) {
                    this._checkMaskFlag(stacks, stacks.indexOf(top), false);
                } else {
                    this._checkMaskFlag(stacks, stacks.indexOf(top), !top.lucency && (top.sizeMode == kUiSize.mixFull || top.sizeMode == kUiSize.full));
                }
            }
        }
    }

    updateVisibleAll() {
        let ctrl: ViewCtrl;
        // if (gFramework.layerMgr.layerFlagIndex > 0) {
        //     guideModel.hideGuide();
        //     for (let i = 1; i < this._ctrlStack.length; i++) {
        //         ctrl = this._ctrlStack[i];
        //         if (!ctrl) continue;
        //         if (ctrl.layer != UILayer.UI_Main) {
        //             if (!ctrl.loaded || ctrl.border || ctrl.maskIgnore) continue;
        //             if (!!ctrl.view) {
        //                 ctrl.hide();
        //             }
        //         }
        //     };
        {
            let len = this._ctrlStack.length - 1;
            let tempLayer = [];
            for (let i = len; i >= 0; i--) {
                ctrl = this._ctrlStack[i];
                if (!ctrl) continue;
                if (!tempLayer.includes(ctrl.layer)) {
                    tempLayer.push(ctrl.layer);
                    if (ctrl.layer != UILayer.UI_Main) {
                        if (!ctrl.loaded || ctrl.border || ctrl.maskIgnore) continue;
                        if (!!ctrl.view) {
                            ctrl.show();
                            const stacks = this._ctrlStack.filter(ctrl1 => {
                                return ctrl.layer === ctrl1.layer;
                            });
                            this._rect.set(0, 0, 1, 1);
                            this._checkMaskFlag(stacks, stacks.indexOf(ctrl), !ctrl.lucency && (ctrl.sizeMode == kUiSize.mixFull || ctrl.sizeMode == kUiSize.full));
                        }
                    }
                }
            }
        }
    }

    private _rect = new Rect();
    /** flag 已经可遮挡了 */
    private _checkMaskFlag(stack: ViewCtrl[], index: number, flag: boolean) {
        if (stack.length <= 0) return;
        let ctrl: ViewCtrl;
        if (flag) {
            while (index > 0) {
                ctrl = stack[--index];
                if (!ctrl) return;
                if (!ctrl.loaded || ctrl.border || ctrl.maskIgnore) continue;
                if (!!ctrl.view) {
                    ctrl.hide();
                }
            }
        } else {
            ctrl = stack[--index];
            if (!ctrl) return;
            // if (this._ctrlStack.indexOf(ctrl) < gFramework.layerMgr.layerFlagIndex) {
            //     ctrl.hide();
            //     return;
            // }
            if (!ctrl.loaded || ctrl.border || ctrl.maskIgnore) {
                this._checkMaskFlag(stack, index, false);
            } else {
                flag = !ctrl.lucency && (ctrl.sizeMode == kUiSize.mixFull || ctrl.sizeMode == kUiSize.full);
                if (flag) {
                    this._checkMaskFlag(stack, index, true);
                    ctrl.show();
                } else {
                    if (stack[index + 1]?.lucency) {
                        ctrl.show();
                        this._checkMaskFlag(stack, index, false);
                    } else {
                        let curViewRect = this._rect.clone().set(0, 0, ctrl.view.fcom.width, ctrl.view.fcom.height);
                        if (this._rect.containsRect(curViewRect)) {
                            ctrl.hide();
                        } else {
                            curViewRect.width += _offWidth;
                            curViewRect.height += _offHight;
                            this._rect = curViewRect;
                            ctrl.show();
                        }
                        this._checkMaskFlag(stack, index, false);
                    }
                }
            }
        }
    }

    public createComponent<T extends ViewDef.ViewComp>(ctor: ViewDef.ViewCompClazz<T>, packName: string, viewName: string): T {
        let obj: GObject;
        obj = UIPackage.createObject(packName, viewName);
        obj.ccRenderClazz = ctor.convertAsComponent();
        if (ctor.isScript)
            return (obj.ccRender as FScriptComponent).fscript as any;
        else
            return obj.ccRender as BaseComponent as any;
    }

    public createComponentFromPool<T extends ViewDef.ViewComp>(ctor: ViewDef.ViewCompClazz<T>, packName: string, viewName: string, pool?: GObjectPool): T {
        const obj: GObject = this.createObjectFromPool(packName, viewName, pool);
        if (obj)
            obj.ccRenderClazz = ctor.convertAsComponent();
        if (ctor.isScript)
            return (obj.ccRender as FScriptComponent).fscript as any;
        else
            return obj.ccRender as BaseComponent as any;
    }

    public returnComponent<T extends ViewDef.ViewComp>(comp: T, pool?: GObjectPool) {
        const fobj = comp.fobj;
        if (fobj)
            this.returnObject(fobj, pool);
    }

    public createObject(packName: string, viewName: string) {
        let obj: GObject;
        obj = UIPackage.createObject(packName, viewName);
        return obj;
    }

    private readonly _innerPool = new GObjectPool();
    public createObjectFromPool(packName: string, viewName: string, pool?: GObjectPool) {
        const url = this.getItemURL(packName, viewName);
        gFramework.assert(!!url);
        pool = pool ?? this._innerPool;
        const obj = pool.getObject(url);
        obj[this.kPoolItemKey] = pool;
        return obj;
    }

    public returnObject(obj: GObject, pool?: GObjectPool) {
        pool = pool ?? this._innerPool;
        gFramework.assert(pool === obj[this.kPoolItemKey]);
        obj.removeFromParent();
        pool.returnObject(obj);
    }

    public getCheckItemUrl(packName: string, viewName: string) {
        return UIPackage.getItemURL(packName, viewName);
    }

    public getItemURL(packName: string, viewName: string) {
        const url = UIPackage.getItemURL(packName, viewName);
        gFramework.assert(!!url, packName + "包里不存在" + viewName);
        return url;
    }

    public onRestart() {
        this.reset();
    }

    public reset() {
        this.closeAll();
        if (this.mask) {
            this.mask.dispose();
            this.mask = null;
        }
        if (this.wait) {
            this.wait.dispose();
            this.wait = null;
        }
    }
}