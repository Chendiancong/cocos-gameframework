import { singleton } from "../base/base-decorator";

export interface IViewBetweenProxy {
    showLoading?(maxMs?: number): void;
    hideLoading?(): void;
}

export class ViewBetween {
    @singleton
    static readonly ins: ViewBetween;

    private _proxy: IViewBetweenProxy;

    setProxy(p: IViewBetweenProxy) {
        this._proxy = p;
    }

    showLoading(...args: Parameters<IViewBetweenProxy['showLoading']>): ReturnType<IViewBetweenProxy['showLoading']> {
        return this._invokeProxy('showLoading', ...args);
    }

    hideLoading(...args: Parameters<IViewBetweenProxy['hideLoading']>): ReturnType<IViewBetweenProxy['hideLoading']> {
        return this._invokeProxy('hideLoading', ...args);
    }

    private _invokeProxy<K extends KeysWithType<IViewBetweenProxy, Function>>(key: K, ...args: Parameters<IViewBetweenProxy[K]>): ReturnType<IViewBetweenProxy[K]> {
        return (this._proxy && this._proxy[key])?.call(this._proxy, ...args);
    }
}