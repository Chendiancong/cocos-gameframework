import { debugUtil } from "../base/debugUtil";
import { gMath } from "./math/MathUtil";

/** 数值插值器 */
export class Lerper {
    private _startVal = 0;
    private _endVal = 1;
    private _cur = 0;
    private _duration = 0;
    private _curProgress = 0;
    private _isLimited = true;
    private _isRunning = false;

    get duration() { return this._duration; }
    get isLimited() { return this._isLimited; }
    get isRunning() { return this._isRunning; }
    get curProgress() { return this._curProgress; }
    get startValue() { return this._startVal; }
    get endValue() { return this._endVal; }
    get curValue() {
        return this._startVal + this.curProgress * (this._endVal - this._startVal);
    }

    setStartValue(value: number) {
        this._startVal = value;
        return this;
    }

    setEndValue(value: number) {
        this._endVal = value;
        return this;
    }

    setDuration(value: number) {
        debugUtil.assert(value >= 0);
        this._duration = value;
        return this;
    }

    addDuration(value: number) {
        debugUtil.assert(value >= 0);
        this._duration += value;
        return this;
    }

    setCur(value: number) {
        this._cur = value;
        return this;
    }

    setLimited(value: boolean) {
        this._isLimited = value;
        return this;
    }

    complete() {
        this._isRunning = false;
        this._cur = this._duration;
        this._curProgress = 1;
        return this;
    }

    start() {
        this._isRunning = true;
        this._cur = 0;
        this._calcProgress();
        return this;
    }

    stop() {
        this._isRunning = false;
        return this;
    }

    delta(value: number) {
        if (!this._isRunning)
            return;
        if (this._isLimited)
            this._cur = gMath.clamp(this._cur + value, 0, this._duration);
        else
            this._cur = this._cur + value;

        this._calcProgress();
    }

    private _calcProgress() {
        if (Math.abs(this._duration) < 1e-5) {
            this.complete();
            return;
        }

        this._curProgress = this._cur / this._duration;
        if (Math.abs(this._curProgress - 1) < 1e-5)
            this.complete();
    }
}