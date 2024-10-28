import { _decorator, Component, AudioClip, AssetManager, isValid, Prefab, Node } from 'cc';
import { getGlobal } from 'game-framework/scripts/base/base';
const { ccclass, property } = _decorator;

const audioRefReg = /^audioref:\/\//i;
const paramsReg = /([^=])+=(.+)/g;

type TypeUrlAnalyzer = {
    bundle?: string,
    path: string;
}

@ccclass('AudioRef')
export class AudioRef extends Component {
    @property(AudioClip)
    clip: AudioClip = null;
    @property({ range: [0, 1] })
    volumeScale: number = 1;

    private static _url2Clip: Record<string, AudioClip> = Object.create(null);

    static play(url: string) {
        const curClip = this._url2Clip[url];
        if (curClip === null)
            return;
        if (isValid(curClip))
            gFramework.soundPlayer.playSound(curClip.name, { clip: curClip });
        else {
            const analyzer = this._analyzeUrl(url);
            const resMgr = gFramework.resMgr;
            let bundle: AssetManager.Bundle = void 0;
            if (analyzer.bundle)
                bundle = resMgr.getBundle(analyzer.bundle);
            resMgr.aloadRes(analyzer.path, Prefab, bundle)
                .then(prefab => this._onPrefabLoaded(url, prefab));
        }
    }

    static isAudioRefUrl(url: string) {
        return url.search(audioRefReg) == 0;
    }

    private static _onPrefabLoaded(url: string, prefab: Prefab) {
        const data = prefab.data;
        if (data instanceof Node) {
            const comp = data.getComponent(AudioRef);
            const clip = comp?.clip ?? null;
            this._url2Clip[url] = clip;
            if (isValid(clip))
                gFramework.soundPlayer.playSound(clip.name, { clip, volume: comp.volumeScale });
        } else
            this._url2Clip[url] = null;
        prefab.decRef();
    };

    private static _urlAnalyzed: Record<string, TypeUrlAnalyzer> = Object.create(null);
    private static _analyzeUrl(url: string): Readonly<TypeUrlAnalyzer> {
        let urlAnalyzer = this._urlAnalyzed[url];

        if (urlAnalyzer)
            return urlAnalyzer;

        urlAnalyzer = {
            path: '',
        };
        const innerUrl = url.replace(audioRefReg, '');
        const spliter = innerUrl.split('&');
        urlAnalyzer.path = spliter[0];
        if (spliter.length > 1) {
            const params = spliter[1].split('&');
            for (const p of params) {
                const matcher = p.match(paramsReg);
                if (matcher)
                    urlAnalyzer[matcher[1]] = matcher[2];
                else
                    urlAnalyzer[p] = true;
            }
        }

        this._urlAnalyzed[url] = urlAnalyzer;
        return urlAnalyzer;
    }
}

getGlobal().AudioRef = AudioRef;