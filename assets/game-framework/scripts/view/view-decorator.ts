import { UILayer } from "./LayerMgr";
import { Component, Constructor, js, Label, _decorator } from "cc";
import { BaseComponent } from "./BaseComponent";
import { fgui } from "../base/base";
import { applyMixins } from "../base/jsUtil";
import { ViewMgr } from "./ViewMgr";
import { FBtn } from "./FBtn";
const { ccclass } = _decorator;

const _global: any = typeof window === "object" ? window :
    typeof self === "object" ? self : this;

class MarkExisted {
    private _info: any;

    constructor() {
        this._info = {};
    }

    /** 
     * 设置属性在某组件中的存在标记
     * existed 0 组件没有该属性 1 组件有该属性
     * */
    set(pkgId: string, itemId: string, existed: number) {
        if (!this._info[pkgId])
            this._info[pkgId] = {};
        this._info[pkgId][itemId] = existed;
    }

    /** 
     * 获取属性在某组件中的存在标记
     * -1 未知 0 组件没有该属性 1 组件有该属性
     * */
    get(pkgId: string, itemId: string): number {
        if (!this._info[pkgId])
            return -1;
        return this._info[pkgId][itemId] ?? -1;
    }
}

function fprop_helper(prop: IFProp, classPrototype: any, p: string) {
    prop['pname'] = p;
    let ctor = classPrototype.constructor;
    let fprops: { [p: string]: IFProp };
    if (!ctor.hasOwnProperty("_fprops")) {
        fprops = Object.assign({}, ctor["_fprops"]);
        js.value(ctor, "_fprops", fprops);
    } else {
        fprops = ctor["_fprops"];
    }

    if (p in fprops) {
        let origin = fprops[p];
        if ("params" in origin) {
            prop.params = Object.assign(origin.params, prop.params);
        }
        if (("comp" in origin) && ("comp" in prop)) {
            prop.comp = origin.comp.concat(prop.comp);
        }
        fprops[p] = Object.assign(origin, prop);
    } else {
        if (prop.name == void 0) {
            prop.name = p;
        }
        if (typeof prop.path == "string") {
            prop.names = prop.path.split(".");
        }
        fprops[p] = prop;
    }

    // 可选属性记录属性在组件中的存在性，提高组件不存在属性时的查找效率
    if (fprops[p].required === false)
        fprops[p].exist = new MarkExisted();
}
function doNothing() { }
function fclass_helper(prop: IViewRegisterInfo, classConstructor: any) {
    if (prop?.className)
        ccclass(prop.className)(classConstructor);
    else
        ccclass(classConstructor);
    if (!prop) {
        return;
    }

    if (js.getClassName(js.getSuper(classConstructor)) === "BaseWin") {
        let delayOnLoad = classConstructor.prototype.onLoad;
        if (delayOnLoad) {
            classConstructor.prototype.onLoad = doNothing;
            classConstructor.prototype.delayOnLoad = delayOnLoad;
        }
    }

    let className = js.getClassName(classConstructor);
    if (prop.id == void 0) {
        prop.id = _global.kGameView && _global.kGameView[className] || undefined;
    }
    prop.layer = prop.layer;
    prop.clazz = classConstructor;
    prop.packName = prop.packName;
    prop.viewName = prop.viewName || className;
    prop.className = className;

    if (prop.border) {
        if (prop.layer == undefined) prop.layer = UILayer.UI_Main;
        if (prop.sizeMode == undefined) prop.sizeMode = 0;
        if (prop.mask == undefined) prop.mask = false;
        if (prop.tweenEffect == undefined) prop.tweenEffect = false;
        if (prop.afterEffect == undefined) prop.afterEffect = false;
        if (prop.clickout == undefined) prop.clickout = false;
    } else {
        let full = (prop.sizeMode === kUiSize.full) || (prop.sizeMode === kUiSize.mixFull);
        if (prop.layer == undefined) prop.layer = UILayer.UI_PopWindow;
        if (prop.sizeMode == undefined) {
            switch (prop.layer) {
                case UILayer.UI_PopWindow:
                    break;
                default:
                    prop.sizeMode = 0;
            }
        }
        if (prop.mask == undefined) {
            if (full) prop.mask = false;
        }
        if (prop.tweenEffect == undefined) prop.tweenEffect = !full;
        if (prop.afterEffect == undefined) prop.afterEffect = true;
        if (prop.clickout == undefined) prop.clickout = !full;
    }

    ViewMgr.reg(prop);
}

export function fprop(classPrototype: any, p: string)
export function fprop(prop: IFProp)
export function fprop(param1?: any, param2?: any) {
    if (param1 instanceof BaseComponent) {
        fprop_helper({}, param1, param2);
    } else {
        return fprop_helper.bind(null, param1);
    }
}

export function fclass(classConstructor: Constructor<BaseComponent>)
export function fclass(prop: IViewRegisterInfo)
export function fclass(param: any) {
    if ("function" === typeof param) {
        fclass_helper(undefined, param);
    } else {
        return fclass_helper.bind(null, param);
    }
}

export function fctrl(classPrototype: any, p: string) {
    fprop_helper({ ctrl: true }, classPrototype, p);
}

export function fanim(classPrototype: any, p: string) {
    fprop_helper({ anim: true }, classPrototype, p);
}

export function ftype<T extends Component>(type: Constructor<T>) {
    return fprop({ type });
}

export function fvirtual(classPrototype: any, p: string) {
    fprop_helper({ virtual: true }, classPrototype, p);
}

export function flistRenderer<T extends Component>(type: Constructor<T>) {
    return fprop({ itemRenderer: type });
}

export function floader<T extends Component>(type: Constructor<T>): any;
export function floader<T extends Component>(type: Constructor<T>, packageName: string, viewName: string)
export function floader() {
    let type = arguments[0];
    if (arguments.length == 1) {
        return fprop({ loader: { type } });
    } else if (arguments.length > 2) {
        let packageName = arguments[1];
        let viewName = arguments[2];
        return fprop({ loader: { type, packageName, viewName } });
    }
}

export function fname(name: string) {
    return fprop({ name })
}

export function foptional(classPrototype: any, p: string) {
    fprop_helper({ required: false }, classPrototype, p);
}

export function fbtn(params: { [x: string]: any }) {
    return fprop({ type: FBtn, params });
}

export function fpresstip(params: { [x: string]: any }) {
    /// return fprop({ type: LongPressTips, params });
}

export function fcomp<T extends Component>(comp: Constructor<T>): any;
export function fcomp<T extends Component>(comp: Constructor<T>, loader: boolean): any;
export function fcomp<T extends Component>(comp: Constructor<T>, params: { [x: string]: any }): any;
export function fcomp<T extends Component>(comp: Constructor<T>, loader: boolean, params: { [x: string]: any }): any;
export function fcomp() {
    let comp = arguments[0];
    if (arguments.length == 1) {
        return fprop({ comp: [{ comp }] });
    } else if (arguments.length >= 2) {
        let params: any;
        let loader: boolean;
        if (typeof arguments[1] == "object") {
            params = arguments[1];
            return fprop({ comp: [{ comp, params }] });
        } else {
            loader = arguments[1];
            if (arguments.length > 2) {
                params = arguments[2];
                return fprop({ comp: [{ comp, params, loader }] });
            } else
                return fprop({ comp: [{ comp, loader }] });
        }
    }
}

// export function fcacheMode(cacheMode: Label.CacheMode) {
//     //@ts-ignore
//     return fprop({ cacheMode, initHandle: textCacheMode });
// }

export function ftextChar(classPrototype: any, p: string) {
    fprop_helper({ cacheMode: Label.CacheMode.CHAR, initHandle: textCacheMode }, classPrototype, p);
}

export function frichChar(classPrototype: any, p: string) {
    fprop_helper({ cacheMode: Label.CacheMode.CHAR, initHandle: richtextCacheMode }, classPrototype, p);
}

export function ftextBitMap(classPrototype: any, p: string) {
    fprop_helper({ cacheMode: Label.CacheMode.BITMAP, initHandle: textCacheMode }, classPrototype, p);
}

export function frichBitMap(classPrototype: any, p: string) {
    fprop_helper({ cacheMode: Label.CacheMode.BITMAP, initHandle: richtextCacheMode }, classPrototype, p);
}

export function fbatch(clazz: any, p: string) {
    fprop_helper({ batch: true }, clazz, p);
}

export function fPreventBatch(clazz: any, p: string) {
    fprop_helper({ preventBatch: true }, clazz, p);
}

export function fmixin(baseCtors: Constructor[]) {
    return function (clazz: any) {
        let fprops: { [name: string]: IFProp };
        if (!clazz.hasOwnProperty("_fprops")) {
            fprops = Object.assign({}, clazz["_fprops"]);
            js.value(clazz, "_fprops", fprops);
        } else {
            fprops = clazz["_fprops"];
        }

        applyMixins(clazz, baseCtors);
        for (let ctor of baseCtors) {
            let basefprops = ctor["_fprops"];
            if (basefprops != void 0) {
                for (let k in basefprops)
                    fprops[k] = basefprops[k];
            }
        }
    }
}

function textCacheMode(this: BaseComponent, textField: fgui.GTextField, prop: any) {
    if (!textField.node) return;
    const label = textField.node.getComponent(Label);
    label.cacheMode = prop.cacheMode;
    if (prop.cacheMode == Label.CacheMode.CHAR) {
        if (textField._label.outlineWidth > 0)
            label.spacingX -= textField._label.outlineWidth;
    }
}

function richtextCacheMode(this: BaseComponent, textField: fgui.GRichTextField, prop: any) {
    if (!textField.node) return;
    const label = textField.node.getComponent(Label);
    label.cacheMode = prop.cacheMode;
    if (prop.cacheMode == Label.CacheMode.CHAR) {
        if (textField._label.outlineWidth > 0)
            label.spacingX -= textField._label.outlineWidth;
    }
}
