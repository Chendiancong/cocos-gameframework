import { autoProperty } from "../base/base-decorator";
import { applyMixins } from "../base/jsUtil";
import { getLocalDate } from "../base/timeUtil";
import { gameNet, getServerTime } from "../net/GameNet";
import { ITimerHandler, timerCenter } from "./TimerCenter";

export class TimerClass {
    @autoProperty(function () { return []; })
    _schedulers: Array<ITimerHandler>;
    schedule(method: Function, methodObj: any = this, time: number = 0) {
        let handler = timerCenter.schedule(method, methodObj, time);
        this._schedulers.push(handler);
        return handler;
    }

    removeObjSchedule(methodObj: any = this) {
        let th: ITimerHandler;
        for (let i = this._schedulers.length - 1; i >= 0; i--) {
            th = this._schedulers[i];
            if (th.methodObj === methodObj) {
                th.stop();
                this._schedulers.splice(i, 1);
            }
        }
    }

    /**
     * 延迟 （执行循环）
     * @param delay  延迟的毫秒数
     * @param method 
     * @param methodObj 
     * @param time 执行间隔毫秒数
     * @returns 
     */
    scheduleDelay(delay: number, method: Function, methodObj: any = this, time: number = 0) {
        let handler = timerCenter.scheduleDelay(delay, method, methodObj, time);
        this._schedulers.push(handler);
        return handler;
    }

    /**
     *  延迟 （单次执行）
    * @param delay  延迟的毫秒数
    * @param method 
    * @param methodObj 
    * @returns 
    */
    doDelay(delay: number, method: Function, methodObj: any = this) {
        let handler = timerCenter.doDelay(delay, method, methodObj);
        this._schedulers.push(handler);
        return handler;
    }

    unschedule(method: Function, methodObj: any = this) {
        let th: ITimerHandler;
        for (let i = this._schedulers.length - 1; i >= 0; i--) {
            th = this._schedulers[i];
            if (th.method === method && th.methodObj === methodObj) {
                th.stop();
                this._schedulers.splice(i, 1);
            }
        }
    }

    scheduleUpdate() { return this.schedule((<any>this).update); }
    unscheduleUpdate() { this.unschedule((<any>this).update); }

    performDelay(delay: number, method: Function, methodObj: any = this) {
        let handler = timerCenter.doDelay(delay, method, methodObj);
        return handler;
    }

    performAtTime(time: number, method: Function, methodObj: any = this) {
        let now: number;
        now = getServerTime();
        if (now >= time)
            return;
        return this.performDelay(time - now, method, methodObj);
    }

    performAtHour(hour: number, method: Function, methodObj: any = this) {
        let date = new Date();
        /**本地时区 */
        let zone = -date.getTimezoneOffset() / 60;
        /**服务器时区 */
        let serverZone = 8;

        let now: number;
        if (gameNet)
            now = getServerTime();
        date = getLocalDate(serverZone, now);
        date.setHours(hour + (zone - serverZone));
        date.setMinutes(0);
        date.setSeconds(0);
        date.setMilliseconds(0);
        let time = date.getTime();
        if (now >= time)
            time += 86400000;

        return this.scheduleDelay(time - now, method, methodObj, 86400000);
    }

    removeSchedulers() {
        for (let e of this._schedulers)
            e.stop();
        this._schedulers = [];
    }
}

export function scheduleable<T>(ctor: Constructor<T>) {
    applyMixins(ctor, [TimerClass]);
}
