import { Component, Enum, ParticleSystem, _decorator } from "cc";
import { DEBUG } from "cc/env";

const { ccclass, property } = _decorator;

enum PlayMode {
    Normal,
    Forever
}

Enum(PlayMode);

enum TargetBindingMode {
    Auto,
    Manual
}

Enum(TargetBindingMode)

const enum InnerState {
    Init,
    Play,
    Pause,
    WillStop,
    Stop
}

const bindingModeTooltip = DEBUG ?
`如何绑定子节点中的ParticleSystem:
Auto：自动绑定，会自动寻找所有子节点中的ParticleSystem
Manual：手动指定` :
'';

const playModeTooltip = DEBUG ?
`播放类型：
Normal：限时播放，指定Duration Sec持续时间
Forever：持续播放直到被移除` :
'';

const softStopTooltip = DEBUG ?
`是否缓慢暂停，缓慢暂停的时候，会先停止粒子的播放，经过SoftStopSec秒后再将自身移除` :
'';

@ccclass('ParticlePlayer')
export class ParticlePlayer extends Component {
    @property({ type: TargetBindingMode, tooltip: bindingModeTooltip })
    bindingMode = TargetBindingMode.Auto;
    @property({
        type: [ParticleSystem],
        visible: function (this: ParticlePlayer) {
            return this.bindingMode === TargetBindingMode.Manual
        }
    })
    targets: ParticleSystem[] = [];
    @property({ type: PlayMode, tooltip: playModeTooltip })
    playMode = PlayMode.Normal;
    @property({
        min: 0.1,
        visible: function (this: ParticlePlayer) {
            return this.playMode === PlayMode.Normal
        }
    })
    durationSec: number = 1;
    @property({ tooltip: softStopTooltip })
    softStop: boolean = false;
    @property({
        min: 0.1,
        visible: function (this: ParticlePlayer) {
            return this.softStop;
        }
    })
    softStopSec: number = 1;

    private _innerState = InnerState.Init;
    private _version = 0;
    private _listener: gFramework.IPlayableListener<ParticlePlayer>;

    setListener(listener: gFramework.IPlayableListener<ParticlePlayer>) {
        this._listener = listener;
    }

    play() {
        if (!this._switchState(InnerState.Play))
            return;
        ++this._version;
        this.targets.forEach(t => t.play());
        if (this.playMode === PlayMode.Normal)
            this._delayStop(this.durationSec);
        this._listener?.onTargetPlay?.call(this._listener, this);
    }

    pause() {
        if (!this._switchState(InnerState.Pause))
            return;
        ++this._version;
        this.targets.forEach(t => t.pause());
        this._listener?.onTargetPause?.call(this._listener, this);
    }

    stop() {
        if (!this._switchState(InnerState.WillStop))
            return;
        ++this._version;
        this._listener?.onTargetWillStop?.call(this._listener, this);
        if (this.softStop)
            this._doSoftStop(this.softStopSec);
        else
            this.stopImmediately();
    }

    stopImmediately() {
        if (!this._switchState(InnerState.Stop))
            return;
        ++this._version;
        this._doStopImmediately();
        this._listener?.onTargetStop?.call(this._listener, this);
    }

    protected onLoad() {
        if (this.bindingMode === TargetBindingMode.Auto) {
            const systems: ParticleSystem[] = [];
            this.node.walk(
                n => {
                    if (n === this.node)
                        return;
                    const comp = n.getComponent(ParticleSystem);
                    if (comp?.isValid)
                        systems.push(comp);
                }
            );
            this.targets = systems;
        }
    }

    private async _delayStop(delaySec: number) {
        const curVer = this._version;
        await this.exWaitSec(delaySec);
        if (curVer !== this._version)
            return;
        this.stop();
    }

    private async _doSoftStop(softSec: number) {
        const curVer = this._version;
        this.targets.forEach(t => t.stopEmitting());
        await this.exWaitSec(softSec);
        if (curVer !== this._version)
            return;
        this.stopImmediately();
    }

    private _doStopImmediately() {
        this.targets.forEach(t => t.stop());
    }

    private _switchState(nextState: ParticlePlayer['_innerState']) {
        if (this._innerState === nextState)
            return false;
        this._innerState = nextState;
        return true;
    }
}