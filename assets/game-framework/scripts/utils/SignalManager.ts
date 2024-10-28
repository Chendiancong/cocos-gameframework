import { applyMixins } from "../base/jsUtil";

export class SignalManager<Signal extends string|number|symbol = string|number> implements gFramework.ISignalManager<Signal> {
    declare signalDatas: Record<Signal, any>;

    setSignal(key: Signal) {
        this._internalSetCustomData(key, 0);
    }

    setCustomSignal(key: Signal, data: any) {
        this._internalSetCustomData(key, 1, data);
    }

    getSignal(key: Signal, defaultValue?: any) {
        return this._internalGetCustomData(key)??defaultValue;
    }

    consumeSignal(key: Signal) {
        const d = this._internalGetCustomData(key);
        if (typeof d == "number")
            this._internalSetCustomData(key, 1, Math.max(d - 1, 0));
        else
            this._internalSetCustomData(key, null);
    }

    clearOneSignal(key: Signal) {
        delete this.signalDatas[key];
    }

    clearSignal() {
        if (this.signalDatas != void 0) {
            for (const k in this.signalDatas)
                delete this.signalDatas[k];
        }
    }

    /**
     * @param mode 设置模式，0：自动模式，当前信号未设置，则将信号值设为1，当信号值为数字时+1，1：将信号设置为特定值
     * @param value 设置模式为1时需要提供的信号值
     */
    private _internalSetCustomData(key: Signal, mode: 0|1, value?: any) {
        if (this.signalDatas == void 0)
            this.signalDatas = Object.create(null);
        if (mode == 0) {
            const oldData = this.signalDatas[key];
            if (typeof oldData == "number")
                this.signalDatas[key] = Math.max(oldData + 1, 0);
            else if (oldData == void 0)
                this.signalDatas[key] = 1;
        } else
            this.signalDatas[key] = value;
    }

    private _internalGetCustomData(key: Signal) {
        if (this.signalDatas == void 0)
            return undefined;
        else
            return this.signalDatas[key];
    }
}

export function mixinSignalHelper(clazz: Function) {
    applyMixins(clazz, [SignalManager]);
}