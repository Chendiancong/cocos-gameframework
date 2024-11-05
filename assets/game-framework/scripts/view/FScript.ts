import { BaseComponent } from "./BaseComponent";
import { observerable, ObserverClass } from "../events/ObserverClass";
import { GComponent } from "fairygui-cc";
import { FPropHandleContext, fpropUtil } from "./FPropUtil";
import { IBaseWin } from "./BaseWin";
import { CommonWin } from "./CommonWin";
import { getGlobal } from "../base/base";

export interface FScript<T = any> extends ObserverClass {}

@observerable
export class FScript<T = any> implements ObserverClass, ViewDef.ViewComp<T> {
    protected _propsInited: boolean;
    protected _component: FScriptComponent<T>;

    get node() { return this._component?.node; }
    get fobj() { return this._component?.fobj; }
    get fcom() { return this._component?.fcom; }
    get propsInited() { return this._propsInited; }
    get observeWhenEnable() { return false; }
    get component() { return this._component; }
    get clazz() { return this.constructor as Constructor<FScript<T>> }

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

    static convertAsWin(): Constructor<BaseComponent> {
        throw new Error();
    }

    static convertAsComponent(): Constructor<BaseComponent> {
        const key = '$fscriptcomp';
        const desc = Object.getOwnPropertyDescriptor(this, key);
        if (desc)
            return desc.get.call(this);
        const that = this;
        const clazz = class AnonymousFScriptComponent extends FScriptComponent {
            static readonly kClassName = `FScriptComponent_${this.name}`;

            __preload(): void {
                super.__preload && super.__preload.call(this, ...arguments);
                this.fscript = new that();
            }
        }
        Object.defineProperty(this, key, {
            get() { return clazz; },
            configurable: false,
            enumerable: true,
        });

        return clazz;
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

    protected selectChanged(selected: boolean) { }

    protected dataChanged(data: T) {}

    protected onDispose() { }
}

@observerable
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

    static convertAsWin(): Constructor<BaseComponent> {
        const key = '$fscriptwincomp';
        const desc = Object.getOwnPropertyDescriptor(this, key);
        if (desc)
            return desc.get.call(this);
        const that = this;
        const clazz = class AnonymousFScriptWinComponent extends FScriptComponent {
            static readonly kClassName = `FScriptWinComponent_${that.name}`

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

        return clazz;
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
        v?.initProp();
    }

    open(params?: any) {
        this._fscript?.open && this._fscript.open(params);
    }

    close() {
        this._fscript?.close && this._fscript.close();
    }

    reconnect() {
        this._fscript?.reconnect && this._fscript.reconnect();
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

    static createAnonymousClass(type: Constructor<FScript>) {
        const key = '$fscriptComp';
        if (type[key])
            return type[key];
        const clazz = class AnonymousFScriptComponent extends FScriptComponent {
            static classType = `FScriptComponent_${type.name}`;

            __preload(): void {
                super.__preload && super.__preload.call(this, ...arguments);
                this.fscript = new type();
            }
        };
        type[key] = clazz;
        return type[key];
    }
}

getGlobal().FScript = FScript;
getGlobal().FScriptWin = FScriptWin;
getGlobal().FScriptComponent = FScriptComponent;