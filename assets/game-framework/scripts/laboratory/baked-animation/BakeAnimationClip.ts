import { _decorator, Component, AnimationClip, Animation, Node, path, CCObject, murmurhash2_32_gc } from 'cc';
import { editorUtil } from 'game-framework/scripts/editor/EditorUtil';
import { aspects } from 'game-framework/scripts/utils/Aspects';
const { ccclass, property } = _decorator;

type TrackInfo = {
    nodePath: string,
    component: string,
    properties: string
}

type TrackInfoGroup = {
    [nodePath: string]: TrackInfo[]
}

export type AnimationFrameData = TrackInfo&{
    values: (string|number)[]
}

export type AnimationGenerateData = {
    uuid: string,
    animName: string,
    duration: number,
    sample: number,
    totalFrame: number,
    loop: boolean,
    frameDatas: { [nodePath_component_properties: string]: AnimationFrameData },
}

@ccclass('BakeAnimationClip')
export class BakeAnimationClip extends Component {
    @property(AnimationClip)
    targetClip: AnimationClip;
    @property({ displayName: '是否按照60帧采样' })
    highQuality: boolean = false;

    @property
    get doit() { return false; }
    set doit(value: boolean) {
        if (!this.targetClip) {
            const animComp = this.getComponent(Animation);
            this.targetClip = animComp.defaultClip;
        }
        if (value && this.targetClip) {
            // const convertedTrackData = this._convertAnimationClip(this.targetClip);
            // this._sampleAnimation(this.targetClip, convertedTrackData)
            //     .then(genData => {
            //         console.log('开始生成动画数据');
            //         return editorUtil.queryAssetInfo(this.targetClip.uuid);
            //     })
            this._convertAnimationClip(this.targetClip);
        }
    }

    @aspects.editor
    private async _convertAnimationClip(clip: AnimationClip) {
        const convertedTrackData: TrackInfoGroup = {};
        const tracks = clip.tracks;
        for (const { path } of tracks) {
            const singleData: TrackInfo = {
                nodePath: '',
                component: '',
                properties: ''
            };
            for (let i = 0, len = path.length; i < len; ++i) {
                if (path.isHierarchyAt(i)) {
                    singleData.nodePath = singleData.nodePath ?
                        `${singleData.nodePath}/${path.parseHierarchyAt(i)}` :
                        `${path.parseHierarchyAt(i)}`
                } else if (path.isComponentAt(i)) {
                    singleData.component = singleData.component ?
                        `${singleData.component}.${path.parseComponentAt(i)}` :
                        `${path.parseComponentAt(i)}`;
                } else if (path.isPropertyAt(i)) {
                    singleData.properties = singleData.properties ?
                        `${singleData.properties}.${path.parsePropertyAt(i)}` :
                        `${path.parsePropertyAt(i)}`;
                }
            }
            if (!convertedTrackData[singleData.nodePath])
                convertedTrackData[singleData.nodePath] = [];
            convertedTrackData[singleData.nodePath].push(singleData);
        }
        console.log('convertedTrackData', convertedTrackData);
        console.log('开始生成动画数据');
        const genData = await this._sampleAnimation(clip, convertedTrackData);
        const assetInfo = await editorUtil.queryAssetInfo(clip.uuid);
        const assetDir = path.dirname(assetInfo.path);
        await editorUtil.createOrSaveAsset(
            `${assetDir}/${clip.name}-generate.json`,
            JSON.stringify(genData, void 0, 2)
        );
        console.log('生成动画数据 done');
    }

    @aspects.editor
    private async _sampleAnimation(targetClip: AnimationClip, trackGroup: TrackInfoGroup) {
        const tempNode: Node = new Node(`_tempNode_${targetClip.name}`);
        tempNode.parent = this.node;
        tempNode._objFlags = CCObject.Flags.DontSave;
        // 根据整理后的动画数据创建相同结构的node
        for (const k in trackGroup) {
            const trackInfos = trackGroup[k];
            let curNode = tempNode;
            if (k) {
                const pathSections = k.split('/');
                for (const nodeName of pathSections) {
                    let child = curNode.getChildByPath(nodeName);
                    if (!child) {
                        child = new Node(nodeName);
                        child.parent = curNode;
                    }
                    curNode = child;
                }
            }
            for (const t of trackInfos) {
                if (t.component) {
                    if (!curNode.getComponent(t.component))
                        curNode.addComponent(t.component);
                }
            }
        }

        const animComp = tempNode.addComponent(Animation);
        animComp.clips = [targetClip];
        animComp.defaultClip = targetClip;

        const duration = targetClip.duration;
        const sample = this.highQuality ? 60 : targetClip.sample;
        const frameRate = 1/sample;
        console.log(`clip duration info`, sample, frameRate, duration);

        const frameDataDic: Record<string, AnimationFrameData> = Object.create(null);
        const genData: AnimationGenerateData = {
            uuid: '',
            animName: targetClip.name,
            duration,
            sample,
            totalFrame: Math.ceil(sample*duration),
            loop: (targetClip.wrapMode & (1 << 1)) > 0,
            frameDatas: frameDataDic
        }
        for (const k in trackGroup) {
            const trackInfos = trackGroup[k];
            for (const ti of trackInfos) {
                const key = this._getFrameKey(ti);
                let frameData = frameDataDic[key];
                if (!frameData) {
                    frameData = frameDataDic[key] = Object.assign(Object.create(null), ti)
                    frameData.values = [];
                }
            }
        }

        const animState = animComp.getState(targetClip.name);
        let curTime = 0;
        while (curTime < duration) {
            animState.setTime(curTime);
            const _ = animState.sample();
            for (const k in trackGroup) {
                const trackInfos = trackGroup[k];
                for (const ti of trackInfos)
                    this._recordFrameData(
                        frameDataDic[this._getFrameKey(ti)],
                        tempNode, ti
                    );
            }
            curTime = Math.min(duration, curTime + frameRate);
        }

        // 最后一帧
        {
            animState.setTime(duration);
            for (const k in trackGroup) {
                const trackInfos = trackGroup[k];
                for (const ti of trackInfos) {
                    this._recordFrameData(
                        frameDataDic[this._getFrameKey(ti)],
                        tempNode, ti
                    );
                }
            }
        }

        tempNode.parent = void 0;
        tempNode.destroy();

        genData.uuid = murmurhash2_32_gc(JSON.stringify(genData), 666).toString();
        return genData;
    }

    private _getFrameKey(trackInfo: TrackInfo) {
        return `${trackInfo.nodePath||'.'}#${trackInfo.component||'.'}#${trackInfo.properties}`;
    }

    private _recordFrameData(frameData: AnimationFrameData, rootNode: Node, trackInfo: TrackInfo) {
        let targetNode: Node;
        let targetComponent: Component;
        if (trackInfo.nodePath)
            targetNode = rootNode.getChildByPath(trackInfo.nodePath);
        else
            targetNode = rootNode;
        if (trackInfo.component)
            targetComponent = targetNode.getComponent(trackInfo.component);
        if (!targetNode || (trackInfo.component && !targetComponent))
            throw new Error('missing target node or component!');

        const prop = this._getPropertyValue(targetNode, targetComponent, trackInfo.properties);

        switch (trackInfo.properties) {
            case 'position':
            case 'scale':
                frameData.values.push(prop.x, prop.y, prop.z);
                break;
            case 'contentSize':
                frameData.values.push(prop.width, prop.height);
                break;
            case 'opacity':
                frameData.values.push(prop);
                break;
            default:
                console.log('unknown property', trackInfo.properties);
                return;
        }
    }

    private _getPropertyValue(targetNode: Node, targetComponent: Component, propName: string) {
        return (targetComponent ? targetComponent[propName] : targetNode[propName]);
    }
}