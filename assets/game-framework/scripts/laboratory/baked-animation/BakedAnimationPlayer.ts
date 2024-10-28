import { Animation, CCObject, Component, Eventify, JsonAsset, Node, UITransform, _decorator } from "cc";
import { aspects } from "game-framework/scripts/utils/Aspects";
import { type AnimationGenerateData } from './BakeAnimationClip';

const { ccclass, property, executeInEditMode, playOnFocus } = _decorator;

@ccclass('BakedAnimationPlayer')
@executeInEditMode
@playOnFocus
export class BakedAnimationPlayer extends Eventify(Component) {
    @property([JsonAsset])
    generatedAnimDatas: JsonAsset[] = [];
    @property
    defaultAnim: string = '';

    @property
    get testPlay() { return false; }
    set testPlay(value: boolean) {
        if (!value || !aspects.checkEditor())
            return;
        for (const data of this.generatedAnimDatas) {
            const json = data.json as AnimationGenerateData;
            const animInfo = this._animInfos[json.animName];
            if (!animInfo || animInfo.uuid != json.uuid)
                this._animInfos[json.animName] = new AnimInfo(this, json);
        }
        this._play(this.defaultAnim);
    }

    @property({ displayName: '复位' })
    get resetToFirstFrame() { return false; }
    set resetToFirstFrame(value: boolean) {
        if (!value)
            return;
        this._curAnim?.reset();
    }

    get readyToPlay() {
        return this.isValid && this.generatedAnimDatas.length > 0;
    }

    private _animInfos: Record<string, AnimInfo> = Object.create(null);
    declare private _curAnim: AnimInfo;

    onLoad() {
        for (const data of this.generatedAnimDatas) {
            const json = data.json as AnimationGenerateData;
            this._animInfos[json.animName] = new AnimInfo(this, json);
        }
        if (this.defaultAnim)
            this._play(this.defaultAnim);
    }

    update(dt: number) {
        const curAnim = this._curAnim;
        if (!curAnim)
            return;

        curAnim.tick(dt);
    }

    play(animName: string) {
        if (!(this._objFlags&CCObject.Flags.IsOnLoadCalled)) {
            this.defaultAnim = animName || this.defaultAnim;
            return;
        }
        this._play(animName);
    }

    stop() {
        this._curAnim?.stop();
    }

    pause() {
        this._curAnim?.pause();
    }

    private _play(animName) {
        const anim = this._curAnim = this._animInfos[animName];
        if (anim)
            anim.start();
    }
}

const enum AnimState {
    Stop,
    Play,
    Pause,
    Finished,
}

const kPlayStates = {
    [AnimState.Play]: true,
}

const kStopStates = {
    [AnimState.Stop]: true,
    [AnimState.Finished]: true
}

const kPauseStates = {
    [AnimState.Pause]: true,
}

class AnimInfo {
    declare uuid: string;
    declare animName: string;
    declare duration: number;
    declare sample: number;
    declare totalFrame: number;
    declare loop: boolean;
    declare framePerSec: number;
    curTime: number = 0;
    curFrameId: number = -1;
    animState = AnimState.Stop;
    playTimes = 0;
    player: BakedAnimationPlayer;
    tracks: TrackInfo[];

    constructor(player: BakedAnimationPlayer, genData: AnimationGenerateData) {
        this.player = player;
        this.tracks = [];

        this.uuid = genData.uuid;
        this.animName = genData.animName;
        this.duration = genData.duration;
        this.sample = genData.sample;
        this.totalFrame = genData.totalFrame;
        this.loop = genData.loop;
        this.framePerSec = 1/genData.sample;

        for (const k in genData.frameDatas) {
            const {
                nodePath,
                component,
                properties,
                values
            } = genData.frameDatas[k]
            const track = new TrackInfo();
            this.tracks.push(track);
            if (nodePath == '')
                track.targetNode = player.node;
            else
                track.targetNode = player.node.getChildByPath(nodePath);
            if (!track.targetNode)
                throw new Error(`missing target node ${nodePath}`);
            if (component == '')
                track.targetComponent = void 0;
            else {
                track.targetComponent = track.targetNode.getComponent(component);
            }
            if (component && !track.targetComponent)
                throw new Error(`missing target component ${component}`);
            track.frameValues = values;

            track.targetPropName = properties;
            switch (properties) {
                case 'position':
                    track.frameHandle = positionFrame;
                    break;
                case 'scale':
                    track.frameHandle = scaleFrame;
                    break;
                case 'contentSize':
                    track.frameHandle = contentSizeFrame;
                    break;
                case 'opacity':
                    track.frameHandle = componentNumberFrame;
                    break;
                default:
                    gFramework.warn(`unhandle property ${properties}`);
            }
            this.tracks.push(track);
        }
    }

    start() {
        if (!kStopStates[this.animState] && !kPauseStates[this.animState])
            return;
        let curState = this.animState;
        this.animState = AnimState.Play;
        if (!kPauseStates[curState]) {
            this.curTime = 0;
            this.curFrameId = -1;
            this.playTimes = 0;
        }
    }

    tick(dt: number) {
        if (!kPlayStates[this.animState])
            return;

        let {
            curTime, curFrameId, playTimes,
            player,
        } = this;
        curTime += dt;
        this.curTime = curTime;
        let frameId = Math.floor(curTime / this.duration * this.totalFrame);
        if (frameId == curFrameId)
            return;
        if (curFrameId < 0)
            player.emit(Animation.EventType.PLAY);

        if (frameId >= this.totalFrame)
            ++playTimes;
        if (playTimes > this.playTimes) {
            if (this.loop) {
                player.emit(Animation.EventType.LASTFRAME);
                frameId = frameId % this.totalFrame;
            } else if (playTimes == 1) {
                player.emit(Animation.EventType.FINISHED);
                this.animState = AnimState.Finished;
                frameId = this.totalFrame - 1;
            }
            this.playTimes = playTimes;
        }
        this.curFrameId = frameId;

        if (kPlayStates[this.animState])
            this._sampleFrame(this.curFrameId);
    }

    reset() {
        this.curTime = 0;
        this.curFrameId = -1;
        this.animState = AnimState.Stop;
        this._sampleFrame(0);
    }

    stop() {
        this.animState = AnimState.Stop;
    }

    pause() {
        this.animState = AnimState.Pause;
    }

    private _sampleFrame(frameId: number) {
        const tracks = this.tracks;
        for (let i = tracks.length; --i >= 0; ) {
            const t = tracks[i];
            t.frameHandle.sample(t, frameId)
        }
    }
}

class TrackInfo {
    targetNode: Node;
    targetComponent: Component;
    targetPropName: string;
    frameHandle: IFrameHandle;
    frameValues: (string|number)[];
}

interface IFrameHandle {
    sample(trackInfo: TrackInfo, frameId: number): void;
}

class PositionFrame implements IFrameHandle {
    sample(trackInfo: TrackInfo, frameId: number) {
        const frameValues = trackInfo.frameValues as number[];
        const idx = frameId * 3;
        if (frameValues.length >= idx + 3) {
            trackInfo.targetNode.setPosition(
                frameValues[idx],
                frameValues[idx+1],
                frameValues[idx+2]
            );
        }
    }
}
const positionFrame = new PositionFrame();

class ScaleFrame implements IFrameHandle {
    sample(trackInfo: TrackInfo, frameId: number) {
        const frameValues = trackInfo.frameValues as number[];
        const idx = frameId * 3;
        if (frameValues.length >= idx + 3) {
            trackInfo.targetNode.setScale(
                frameValues[idx],
                frameValues[idx+1],
                frameValues[idx+2]
            );
        }
    }
}
const scaleFrame = new ScaleFrame();

class ContentSizeFrame implements IFrameHandle {
    sample(trackInfo: TrackInfo, frameId: number): void {
        const frameValues = trackInfo.frameValues as number[];
        const idx = frameId * 2;
        if (frameValues.length >= idx + 2)
            (trackInfo.targetComponent as UITransform).setContentSize(
                frameValues[idx],
                frameValues[idx+1]
            );
    }
}
const contentSizeFrame = new ContentSizeFrame();

class ComponentNumberFrame implements IFrameHandle {
    sample(trackInfo: TrackInfo, frameId: number): void {
        const frameValues = trackInfo.frameValues as number[];
        const idx = frameId;
        if (frameValues.length > idx)
            trackInfo.targetComponent[trackInfo.targetPropName] = frameValues[idx];
    }
}
const componentNumberFrame = new ComponentNumberFrame();