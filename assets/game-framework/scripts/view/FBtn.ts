import { director, game, macro, _decorator } from "cc";
import { fgui } from "../base/base";
import { BaseComponent } from "./BaseComponent";
const { ccclass } = _decorator;
const timeData = {};

@ccclass
export class FBtn extends BaseComponent {

    parmValue: number;

    needTips: boolean = true;

    needGray: boolean;

    _ftnKey: string;

    _isblock: boolean;

    _isblock2: boolean;

    onLoad() {
        this._ftnKey = this.getParentBaseWin().openKey + "_" + this.name;
        this.node.on(fgui.MyEvent.CLICK, this._onClick, this);
        this._timeCheck();
    }

    private _onClick(e) {
        if (this._isblock) {
            return !this.needTips || gFramework.showTips("操作过快");
        } else {
            if (!this._isblock2) {
                timeData[this._ftnKey] = game.totalTime;
                this._timeCheck();
            }
            if (this._fun) {
                this._fun.call(this._thiz, e);
            }
        }
    }

    private _timeCheck() {
        this.unscheduleAllCallbacks();
        let time = timeData[this._ftnKey];
        let leftTimeMs = 0;
        if (!!time) {
            leftTimeMs = time + this.parmValue - game.totalTime;
            if (leftTimeMs > 0) {
                this._isblock = true;
            } else {
                leftTimeMs = 0;
                this._isblock = false;
            }
        } else {
            this._isblock = false;
        }
        this._cutTimeFun(leftTimeMs);
    }

    private _cutTimeFun(leftMs: number) {
        this.unscheduleAllCallbacks();
        if (this._isblock2) return;
        if (leftMs > 0) {
            let leftSec = Math.round(leftMs / 100) || 1;
            this.schedule(() => {
                leftSec--;
                if (leftSec <= 0) {
                    this.unscheduleAllCallbacks();
                    this._isblock = false;
                    if (this.needGray != false) {
                        if (!this._isblock2) this.fcom.grayed = false;
                    }
                }
            }, 0.1, macro.REPEAT_FOREVER);
            this._isblock = true;
            if (this.needGray != false) this.fcom.grayed = true;
        } else {
            this._isblock = false;
            if (this.needGray != false) {
                if (!this._isblock2) this.fcom.grayed = false;
            }
        }
    }

    set text(v: string) {
        this.fcom.getChild("title").text = v;
    }

    private _fun: Function;
    private _thiz: any = null;
    onClick(fun: Function, thiz?: any) {
        this._fun = fun;
        this._thiz = thiz;
    }

    set grayed(b: boolean) {
        this._isblock2 = b;
        if (b) this._isblock = !b;
        this.fcom.grayed = b;
    }

}