import { CCObject, Component, _decorator } from "cc";
import { DeferCenter } from "game-framework/scripts/base/promise";

const { ccclass } = _decorator;

@ccclass('XComponent')
export class XComponent extends Component {
    private _defers = new DeferCenter<void, 'onLoad'|'start'>();

    doAfterOnLoad<F extends (...args) => any>(handler: F, ...args: Parameters<F>) {
        if (this._objFlags&CCObject.Flags.IsOnLoadCalled)
            handler(...args);
        else
            this._defers
                .getPromise('onLoad')
                .then(() => handler(...args));
    }

    doAfterStart<F extends (...args) => any>(handler: F, ...args: Parameters<F>) {
        if (this._objFlags&CCObject.Flags.IsStartCalled)
            handler.call(void 0, ...args);
        else
            this._defers
                .getPromise('start')
                .then(() => handler(...args));

    }

    protected onLoad() {
        this._defers.resolve('onLoad');
    }

    protected start() {
        this._defers.resolve('start');
    }
}