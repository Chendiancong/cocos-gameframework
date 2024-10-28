import * as fgui from 'fairygui-cc';

const _global: any = typeof window === "object" ? window :
    typeof self === "object" ? self : this;

_global.gFramework = _global.gFramework || {};

_global.fgui = fgui;

function getGlobal(propName?: string) {
    if (propName) {
        let prop = _global[propName];
        if (prop == void 0)
            prop = _global[propName] = Object.create(null);
        return prop
    } else
        return _global;
}

function globalHas(propName?: string) {
    return !!_global[propName];
}

export { fgui, getGlobal, globalHas }