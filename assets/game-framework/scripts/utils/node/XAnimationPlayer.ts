import { __private, _decorator, Animation, AnimationState, Component, SkeletalAnimation, Socket } from 'cc';
import { Indirector } from '../Indirector';
const { ccclass, requireComponent } = _decorator;


type InnerEventListener = {
    [K in keyof (typeof Animation)['EventType'] as K extends string ? `on${JustFirstUppercase<K>}` : never]: Parameters<Animation['on']>[1]
}

type XEventListener = {
    'CustomEvent': (...args) => void;
}

export interface IXAnimationEventListener extends Partial<InnerEventListener>, Partial<XEventListener> {}

@ccclass('XAnimationPlayer')
@requireComponent([Animation])
export class XAnimationPlayer extends Component {
    private _evtListener: IXAnimationEventListener;
    private _innerAnimation: Animation;
    private _curAnim: string;
    private _curState: AnimationState;
    private _nextAnims: string[] = [];
    private _ref: Indirector<Animation>;
    private _sockets: Socket[] = [];
    private _animSpeed: Record<string, number> = {};

    get animRef() { return this._ref; }
    get animComp() { return this._innerAnimation; }
    get curAnim() { return this._curAnim; }
    get isPlaying() { return this._curState?.isPlaying; }

    onLoad() {
        const comp = this._innerAnimation = this.getComponent(Animation);
        this._ref = new Indirector(comp);
        comp.on(Animation.EventType.FINISHED, this._onAnimLastFrame, this);
        comp.on(Animation.EventType.LASTFRAME, this._onAnimFinish, this);
        comp.on(Animation.EventType.PAUSE, this._onAnimPause, this);
        comp.on(Animation.EventType.PLAY, this._onAnimPlay, this);
        comp.on(Animation.EventType.RESUME, this._onAnimResume, this);
        comp.on(Animation.EventType.STOP, this._onAnimStop, this);
        if (comp instanceof SkeletalAnimation)
            this._sockets = comp.sockets.concat();
    }

    onDestroy() {
        this._innerAnimation.targetOff(this);
    }

    play(anim: string, force?: boolean) {
        do {
            if (!this.isValid)
                break;
            this._nextAnims.length = 0;
            if (this._curAnim === anim && !force)
                break;
            this._curAnim = anim;
            this._curState = this._innerAnimation.getState(anim);
            this._innerAnimation.play(anim);
        } while (false);

        return this;
    }

    queuePlay(anim: string) {
        do {
            if (!this.isValid)
                break;
            if (this.isPlaying) {
                this._nextAnims.push(anim);
                break;
            }
            this.play(anim);
        } while (false);

        return this;
    }

    playOneTime(anim: string) {
        if (!this.isValid)
            return;
        this._nextAnims.length = 0;
        this._curAnim = anim;
        this._curState = this._innerAnimation.getState(anim);
        return this._innerAnimation.playOneTime(anim);
    }

    setListener(listener: IXAnimationEventListener) {
        this._evtListener = listener;
    }

    isPlayingAnim(anim: string) {
        return this.isValid && (this._curAnim === anim || this._nextAnims.includes(anim));
    }

    /**
     * @deprecated internal method
     */
    CustomEvent(...args) {
        this._invokeListener('CustomEvent', ...args);
    }

    getSocket(index: number): Socket | void {
        return this._sockets[index]
    }

    /** 设置动画的播放速度 */
    getAnimStateSpeed(stateName: string) {
        if (stateName in this._animSpeed)
            return this._animSpeed[stateName];
        const state = this._innerAnimation.getState(stateName);
        if (state)
            this._animSpeed[stateName] = state.speed;
        return this._animSpeed[stateName] ?? 1;
    }

    /** 设置动画的播放速度 */
    setAnimStateSpeed(stateName: string, speed: number) {
        this._animSpeed[stateName] = speed;
        const state = this._innerAnimation.getState(stateName);
        if (state)
            state.speed = speed;
    }

    /** 设置所有动画状态的播放速度 */
    setAnimSpeed(speed: number) {
        for (const sName in this._innerAnimation['_nameToState']) {
            const state = this._innerAnimation.getState(sName);
            this._animSpeed[sName] = speed;
            state.speed = speed;
        }
    }

    private _onAnimLastFrame() {
        this._invokeListener('onLastframe');
        this._onFinish();
    }

    private _onAnimFinish() {
        this._invokeListener('onFinished');
        this._onFinish();
    }

    private _onAnimPause() {
        this._invokeListener('onPause');
    }

    private _onAnimPlay() {
        this._invokeListener('onPlay');
    }

    private _onAnimResume() {
        this._invokeListener('onResume');
    }

    private _onAnimStop() {
        this._invokeListener('onStop');
    }

    private _onFinish() {
        this._curAnim = void 0;
        this._curState = void 0;
        if (this._nextAnims.length)
            this.play(this._nextAnims.shift());
    }

    private _invokeListener<K extends keyof XAnimationPlayer['_evtListener']>(evt: K, ...args: Parameters<XAnimationPlayer['_evtListener'][K]>) {
        if (this._evtListener && this._evtListener[evt])
            this._evtListener[evt].call(this._evtListener, ...args);
    }
}