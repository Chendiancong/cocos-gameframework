import { __private, Prefab } from "cc";
import { BaseComponent } from "./BaseComponent";
import { observerable, ObserverClass } from "../events/ObserverClass";
import { GComponent } from "fairygui-cc";
import { FPropHandleContext, fpropUtil } from "./FPropUtil";
import { isExtends } from "../base/jsUtil";

export interface FScript<T = any> extends ObserverClass {}

@observerable
export class FScript<T = any> {
    private _propsInited: boolean;
    private _component: FScriptComponent<T>;

    get clazz() { return this.constructor as Constructor<FScript<T>>; }

    get propsInited() { return this._propsInited; }
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

    get fobj() { return this._component?.fobj; }
    get fcom() { return this._component?.fcom; }

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

    initProp() {
        return FScript.initProp(this, this.clazz);
    }

    getChild(name: string) {
        return this._component?.getChild(name);
    }

    protected selectChanged(selected: boolean) { }

    protected dataChanged(data: T) {}

    protected onDispose() { }
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

    static createClassWithFScript(type: Constructor<FScript>) {
        const key = '$fscriptComp';
        return type[key] ??
            (type[key] = class extends FScriptComponent {
                __preload(): void {
                    super.__preload && super.__preload.call(this, ...arguments);
                    this.fscript = new type();
                }
            });
    }
}

fpropUtil.setCompSetupHandler({
    onConvertComponent(type: Constructor<ViewDef.ViewComp>) {
        if (isExtends(type, FScript))
            return FScriptComponent.createClassWithFScript(type as Constructor<FScript>);
        else
            return void 0;
    },
})