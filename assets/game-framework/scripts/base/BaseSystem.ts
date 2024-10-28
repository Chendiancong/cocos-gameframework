import { EventTarget } from "cc";
import { ObserverClass } from "../events/ObserverClass";
import { TimerClass } from "../timer/TimerClass";
import { applyMixins } from "./jsUtil";

export class BaseSystem extends EventTarget {
    name: string = "";
    _priority: number = 0;
    _inited: boolean = false;
    _observed = [];
    _schedulers = [];
    _conditionTypes = [];

    preInit?(): void;

    init?(): void;

    reconnect?(): void;

    protected onDispose() { }

    dispose() {
        this.onDispose();
        this.removeObserves();
        this.removeSchedulers();
        Net.targetOff(this);
    }
}

export interface BaseSystem extends ObserverClass, TimerClass { }
applyMixins(BaseSystem, [ObserverClass, TimerClass]);