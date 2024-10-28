import { EventTouch, game, NodeEventType, _decorator } from "cc";
import { GButton, MyEvent } from "fairygui-cc";
import { FguiEvent } from "../utils/fgui/FguiEvent";
import { BaseComponent } from "./BaseComponent";
const { ccclass } = _decorator;

@ccclass
export class LongPressComponent extends BaseComponent {

    private _touchFlag: boolean = false;
    private _touchTime: number;
    onLoad() {
        let fcom = this.fcom;
        fcom.on(FguiEvent.TOUCH_BEGIN, this._touchStart, this);
        fcom.on(FguiEvent.TOUCH_END, this._touchEnd, this);
        fcom.on(FguiEvent.TOUCH_MOVE, this._touchMove, this);
        fcom.on(NodeEventType.TOUCH_END, this._touchEnd, this);
        fcom.on(NodeEventType.TOUCH_CANCEL, this._touchEnd, this);
    }

    private _pause: boolean = true;;
    private _interval: number = 300;
    private _pressLongTime: number = 600
    private _once: boolean = true;
    private _pressStartFun: Function;
    private _pressFun: Function;
    private _clickFun: Function;
    private _pressEndFun: Function;
    private _target: any;
    private _pressCalled: boolean = false;

    set pause(v: boolean) {
        if (v) {
            this.node.emit(NodeEventType.TOUCH_END);
            (this.fcom as GButton).resetCurrentState();
        }
        this._pause = v;
    }

    get pause() {
        return this._pause;
    }

    isPressed() {
        return this._pressCalled;
    }

    onPressStart(pressStartFun: Function) {
        this._pressStartFun = pressStartFun;
        return this;
    }

    /** 按住持续执行 */
    onPress(pressFun: Function) {
        this._pressFun = pressFun;
        return this;
    }

    /** 按住结束执行 */
    onPressEnd(pressEnd: Function) {
        this._pressEndFun = pressEnd;
        return this;
    }

    onClick(clickFun: Function) {
        this._clickFun = clickFun;
        return this;
    }

    setTarget(target: any) {
        this._target = target;
        return this;
    }

    setInterval(interval: number) {
        this._interval = interval;
        return this;
    }
    setLongPress(time: number) {
        this._pressLongTime = time;
    }

    setOnce(value: boolean) {
        this._once = value;
        return this;
    }

    applyPress() {
        this._pressCalled = true;
        if (this._pressFun) {
            this._pressFun.call(this._target);
        }
    }

    private _thoucId: number;
    private _pressFlag: boolean = false;
    private _pressStartTime: number = 0;
    private _touchStart(evt: MyEvent) {
        this._thoucId = evt.touchId;
        this._touchFlag = true;
        this._touchTime = game.totalTime;
        this._pressCalled = false;
        this._pause = false;
        if (this._pressStartFun)
            this._pressStartFun.call(this._target, evt);

        this._pressFlag = false;
        this._pressStartTime = game.totalTime;
    }
    protected onDisable(): void {
        if (this._pressCalled) {
            this._pressCalled = false;
            
        } else if (this._touchFlag) {
            if (this._clickFun) {
                this._clickFun.call(this._target);
            }
        }
        this._pause = true;
        this._pressStartTime = 0;
        this._pressFlag = false;
        this._touchFlag = false;
    }


    private _touchEnd(evt: MyEvent) {
        if (this._pressCalled) {
            this._pressCalled = false;
            if (this._pressEndFun) {
                this._pressEndFun.call(this._target, evt);
            }
        } else if (this._touchFlag) {
            if (this._clickFun) {
                this._clickFun.call(this._target);
            }
        }
        this._pause = true;
        this._pressStartTime = 0;
        this._pressFlag = false;
        this._touchFlag = false;
    }

    private _touchMove(evt: EventTouch) {
        if (!this._touchFlag) {
            return;
        }
        if (evt.type === "fui_touch_move") return;
        let pt = evt.getLocation();
        let startPt = evt.getStartLocation();
        if (Math.abs(pt.x - startPt.x) + Math.abs(pt.y - startPt.y) >= 10) {
            this._touchFlag = false;
            this._pressStartTime = 0;
            this._pressFlag = false;
            if (this._pressCalled) {
                if (this._pressEndFun) {
                    this._pressEndFun.call(this._target, evt);
                }
            }
        }
    }

    private _touchHold() {
        let currTime = game.totalTime;
        let duringTime = currTime - this._touchTime;
        if (duringTime > this._interval) {
            if (this._once) {
                this._touchFlag = false;
            }
            this._touchTime = currTime;
            this._pressFlag = true;
            this.applyPress();
        }
    }

    update() {
        if (this._pause) return;
        if (!this._pressFlag && this._pressStartTime > 0 && ((game.totalTime - this._pressStartTime) >= this._pressLongTime)) {
            this._pressFlag = true;
        }
        if (this._touchFlag && this._pressFlag) {
            this._touchHold();
        }
    }

}