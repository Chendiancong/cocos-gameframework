import { _decorator, Component, Node } from 'cc';
import { Counter } from '../Counter';
const { ccclass, property } = _decorator;

@ccclass('Delay')
export class Delay extends Component {
    @property
    delaySec: number = 1;

    private _isRunning: boolean;
    private _onComplete: (me: Delay) => void;
    private _delayCounter = new Counter();

    setDelay(delaySec: number) {
        this.delaySec = delaySec;
        return this;
    }

    reset() {
        this._delayCounter.setup(this.delaySec, 0);
        return this;
    }

    run() {
        this._isRunning = true;
        this.enabled = true;
        return this;
    }

    stop() {
        this.enabled = false;
        this._isRunning = false;
        this._onComplete = undefined;
    }

    setComplete(func: (me: Delay) => void) {
        this._onComplete = func;
        return this;
    }

    update(deltaTime: number) {
        if (!this._isRunning)
            return;
        if (this._delayCounter.delta(deltaTime)) {
            if (this._onComplete != void 0)
                this._onComplete(this);
            this._onComplete = null;
            this.stop();
        }
    }
}
