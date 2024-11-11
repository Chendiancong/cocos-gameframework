import { BaseComponent } from "./BaseComponent";
import { observerable, ObserverClass } from "../events/ObserverClass";
import { GComponent } from "fairygui-cc";
import { FPropHandleContext, fpropUtil } from "./FPropUtil";
import { IBaseWin } from "./BaseWin";
import { CommonWin } from "./CommonWin";
import { getGlobal } from "../base/base";
import { _decorator, Component } from "cc";
import { ViewCompType } from "./view-define";

export interface FScript<T = any> extends ObserverClass {}

@observerable
@_decorator.ccclass('FScript')
export class FScript<T = any> implements ObserverClass, ViewDef.ViewComp<T> {
    protected _propsInited: boolean;
    protected _component: FScriptComponent<T>;

    get node() { return this._component?.node; }
    get fobj() { return this._component?.fobj; }
    get fcom() { return this._component?.fcom; }
    get propsInited() { return this._propsInited; }
    get observeWhenEnable() { return false; }
    get isValid() { return this._component?.isValid; }
    get clazz() { return this.constructor as ViewDef.ViewCompClazz<FScript<T>>; }
    get compType() { return ViewCompType.FScript; }
    get component() { return this._component; }

    get data() { return this._component?.data; }
    set data(v: T) {
        if (this._component?.isValid)
            this._component.data = v;
    }

    get selected() { return this._component?.selected; }
    set selected(v: boolean) {
        if (this._component?.isValid)
            this._component.selected = v;
    }

    get visible() { return this._component?.visible; }
    set visible(flag: boolean) {
        if (this._component?.isValid)
            this._component.visible = flag;
    }

    static get compType() { return ViewCompType.FScript; }

    static get isScript() { return true; }

    static convertAsWin(): Constructor<BaseComponent> {
        throw new Error();
    }

    static convertAsComponent(): Constructor<BaseComponent> {
        return this._convertClazz('component');
    }

    protected static _convertClazz(target: 'win'|'component') {
        const key = `$fscript${target === 'win' ? 'wincomp' : 'comp'}`;
        const desc = Object.getOwnPropertyDescriptor(this, key);
        if (desc)
            return desc.get.call(this);
        const that = this;
        const clazz = class AnonymousFScriptComponent extends FScriptComponent {
            static readonly kClassName = `FScript${target === 'win' ? 'WinComponent' : 'Component'}`;

            __preload(): void {
                super.__preload && super.__preload.call(this, ...arguments);
                this.fscript = new that();
            }
        }
        Object.defineProperty(this, key, {
            get() { return clazz; },
            configurable: false,
            enumerable: true
        });

        function functionExtend(fname: string) {
            do {
                if (typeof that.prototype[fname] !== 'function')
                    break;
                if (clazz.prototype[fname] && typeof clazz.prototype[fname] !== 'function')
                    break;
                const originF = clazz.prototype[fname] as Function;
                clazz.prototype[fname] = function (this: FScriptComponent) {
                    originF?.call(this, ...arguments);
                    (that.prototype[fname] as Function)
                        .call(this.fscript, ...arguments);
                }
            } while (false);
        }

        functionExtend('onLoad');
        functionExtend('start');
        functionExtend('update');
        functionExtend('onEnable');
        functionExtend('onDisable');
        functionExtend('onDestroy');
        functionExtend('open');
        functionExtend('close');
        functionExtend('reconnect');

        return clazz as Constructor<BaseComponent>;
    }

    static initProp<TScript extends FScript>(instance: TScript, clazz: Constructor<TScript>) {
        if (instance._propsInited)
            return;

        instance._propsInited = true;

        let fcom: GComponent;
        if (!(fcom = instance.fcom))
            return;
        
        if (!clazz)
            return;

        const fprops = clazz['_fprops'] as Record<string, IFProp>;
        if (!fprops || !(fcom instanceof GComponent))
            return;

        const context: FPropHandleContext = {
            instance,
            fcom,
            fchild: void 0,
            fprop: void 0,
            propName: '',
            ccNode: instance._component.node
        }
        for (const pname in fprops) {
            const fprop = fprops[pname];
            context.fprop = fprop;
            context.propName = pname;
            fpropUtil.initHelper(context);
        }
    }

    open?(params?: any): void;

    close?(): void;

    reconnect?(): void;

    dispose(destroy: boolean) {
        this._component?.dispose(destroy);
        this._component = void 0;
    }

    initProp() {
        FScript.initProp(this, this.clazz);
    }

    getChild(name: string) {
        return this._component?.getChild(name);
    }

    getViewCompsInChildren() {
        return this.component?.getComponentsInChildren(FScriptComponent).map(v => v.fscript) ?? [];
    }

    onLoad?(): void;

    start?(): void;

    update?(dt: number): void;

    onEnable?(dt: number): void;

    onDisable?(dt: number): void;

    onDestroy?(dt: number): void;

    protected selectChanged(selected: boolean) { }

    protected dataChanged(data: T) {}

    protected onDispose() { }
}

@observerable
@_decorator.ccclass('FScriptWin')
export class FScriptWin extends FScript<any> implements IBaseWin {
    openKey: string;
    ctrlKey: string;
    fromKey?: string;

    get viewCtrl() {
        return gFramework.viewMgr.getViewCtrl(this.ctrlKey);
    }
    get viewInfo() {
        return this.viewCtrl?.info;
    }
    get source() {
        const ctrlKey = this.viewCtrl.sourceCtrlKey;
        if (ctrlKey)
            return gFramework.viewMgr.getViewCtrl(ctrlKey);
    }

    static get compType() { return ViewCompType.FScriptWin; }

    static get isScript() { return true; }

    static convertAsWin(): Constructor<BaseComponent> {
        return this._convertClazz('win');
    }

    static convertAsComponent(): Constructor<BaseComponent> {
        throw new Error();
    }

    delayOnLoad?(): void;

    setWinTitle(title: string) {
        const commonWin = this.component?.getComponent(CommonWin);
        if (commonWin?.isValid)
            commonWin.winTitle.text = title;
    }

    closeSelf() {
        gFramework.viewMgr.close(this)
    }
}

export class FScriptComponent<T = any> extends BaseComponent<T> {
    private _fscript: FScript<T>;

    get fscript() { return this._fscript; }
    set fscript(v: FScript<T>)  {
        if (v === this._fscript)
            return;
        this._fscript = v;
        v['_component'] = this;
        v?.initProp();
    }

    initProp() {
        super.initProp();
        this._fscript?.initProp();
    }

    /**
     * @deprecated legacy
     */
    legacyInitProp(instance: BaseComponent, clazz: Constructor<BaseComponent>): void {
        if (this.propsInited)
            return;
        super.legacyInitProp(instance, clazz);
        this._fscript?.initProp();
    }

    selectChanged(selected: boolean) {
        this._fscript && this._fscript['selectChanged'](selected);
    }

    dataChanged(data: T) {
        this._fscript && this._fscript['dataChanged'](data);
    }

    onDispose() {
        this._fscript && this._fscript['onDispose']();
    }
}

getGlobal().FScript = FScript;
getGlobal().FScriptWin = FScriptWin;
getGlobal().FScriptComponent = FScriptComponent;