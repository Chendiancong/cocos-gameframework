import { _decorator, Component, Node, CCObject, isValid, AudioSource, AudioClip, director, game, Tween, macro } from 'cc';
import { arrayRemove } from '../../base/jsUtil';
import { ResKeeper } from '../../res/ResKeeper';
import { HashList } from '../data/HashList';
import { gMath } from '../math/MathUtil';
import { nodeUtil } from '../node/NodeUtil';
const { ccclass, property } = _decorator;

export type PlayAudioOption = {
    /** 声音片段 */
    clip?: AudioClip;
    /**
     * 声音url
     */
    url?: string;
    /**
     * bundle名
     */
    bundleName?: string;
    /**
     * 背景音乐是否循环
     */
    loop?: boolean;
    /**
     * 音量，默认为1
     */
    volume?: number;
    /** 
     * 背景音乐切换模式
     */
    musicSwitchMode?: "ease"|"instant";
    /**
     * 强制重新播放
     */
    force?: boolean;
    /**
     * 自动回收时间，<=0为不回收
     */
    expireMs?: number;
}

@ccclass('AudioManager')
export class AudioManager extends Component {
    @property({ range: [1, 20], displayName: "最多同时播放音效数量" })
    maxEffectNum: number = 5;

    private static _ins: AudioManager;
    static get ins() {
        if (!isValid(this._ins)) {
            let node = new Node("AudioPlayer");
            node.parent = director.getScene();
            this._ins = node.addComponent(AudioManager);
            nodeUtil.setNodePersistent(node);
        }
        return this._ins;
    }

    private _volumeScale: number = 1;
    private _musicPlayer: CorePlayer;
    private _effectPlayer: CorePlayer;
    private _uiEffectPlayer: CorePlayer;
    private _musicEnable: boolean = true;
    private _effectEnable: boolean = true;

    get ready() {
        return !!(this._objFlags&CCObject.Flags.IsOnLoadCalled);
    }

    get volumeScale() { return this._volumeScale; }
    set volumeScale(value: number) {
        const old = this._volumeScale;
        this._volumeScale = value;
        this._onVolumeScale(old, value);
    }

    playMusic(option: PlayAudioOption) {
        if (!this._musicEnable)
            return;
        if (option.url) {
            const _option: PlayAudioOption = Object.assign({}, option);
            this._loadClip(_option)
                .then(clip => {
                    _option.clip = clip;
                    this._musicPlayer.play(this, _option);
                })
        } else {
            this._musicPlayer.play(this, option);
        }
    }

    stopMusic() {
        this._musicPlayer.stop(this);
    }

    resumeMusic() {
        (this._musicPlayer as MusicPlayer).resume();
    }

    enableMusic() {
        this._musicEnable = true;
    }

    disableMusic() {
        this._musicEnable = false;
        this.stopMusic();
    }

    playEffect(option: PlayAudioOption) {
        if (!this._effectEnable)
            return;
        if (option.url) {
            const _option: PlayAudioOption = Object.assign({}, option);
            this._loadClip(_option)
                .then(clip => {
                    _option.clip = clip;
                    this._effectPlayer.play(this, _option);
                });
        } else {
            this._effectPlayer.play(this, option);
        }
    }

    playUIEffect(option: PlayAudioOption) {
        if (!this._effectEnable)
            return;
        if (option.url) {
            const _option: PlayAudioOption = Object.assign({}, option);
            this._loadClip(_option)
                .then(clip => {
                    _option.clip = clip;
                    this._uiEffectPlayer.play(this, _option);
                });
        } else {
            this._uiEffectPlayer.play(this, option);
        }
    }

    stopEffect() {
        this._effectPlayer.stop(this);
        this._uiEffectPlayer.stop(this);
    }

    enableEffect() {
        this._effectEnable = true;
    }

    disableEffect() {
        this._effectEnable = false;
        this.stopEffect();
    }

    getTrueVolume(volume: number = 1) {
        return gMath.clamp(this._volumeScale*(volume??1), 0, 1);
    }

    volumeScaleChange(scaledVolume: number, oldScale: number, curScale: number) {
        let originVolume: number;
        if (gMath.almostEqual(oldScale, 0))
            originVolume = 0;
        else
            originVolume = scaledVolume/oldScale;
        return gMath.clamp(curScale*originVolume, 0, 1);
    }

    onLoad() {
        this._musicPlayer = new MusicPlayer(this);
        this._effectPlayer = new EffectPlayer(this, 8);
        this._uiEffectPlayer = new EffectPlayer(this, 1);//SingleEffectPlayer
        const players: CorePlayer[] = [this._musicPlayer, this._effectPlayer, this._uiEffectPlayer];
        this.schedule(() => {
            for (let i = players.length; --i >= 0; )
                players[i].autoClear();
        }, 10, macro.REPEAT_FOREVER);
    }

    private async _loadClip(option: PlayAudioOption) {
        const bundle = gFramework.resMgr.getBundle(option.bundleName)??null;
        return await gFramework.resMgr.aloadRes(option.url, AudioClip, bundle);
    }

    private _onVolumeScale(old: number, cur: number) {
        this._musicPlayer.onVolumeScaleChange(this, old, cur);
        this._effectPlayer.onVolumeScaleChange(this, old, cur);
        this._uiEffectPlayer.onVolumeScaleChange(this, old, cur);
    }
}

abstract class CorePlayer {
    protected root: Node;
    protected itemNum: number = 0;

    constructor(manager: AudioManager, rootName?: string) {
        rootName = rootName??this.constructor.name;
        this.root = new Node(rootName);
        this.root.parent = manager.node;
    }

    abstract play(manager: AudioManager, option: PlayAudioOption): void;

    abstract stop(manager: AudioManager): void;

    abstract onVolumeScaleChange(manager: AudioManager, oldScale: number, curScale: number): void;

    autoClear() { }

    protected getContainer(option: PlayAudioOption) {
        let container = this.root.getChildByName(option.clip.name);
        if (!isValid(container)) {
            container = new Node(option.clip.name);
            container.parent = this.root;
        }
        return container;
    }

    protected createCache<T extends AudioCache>(manager: AudioManager, option: PlayAudioOption, clazz?: Constructor<T>): T {
        const container = this.getContainer(option);
        const nodeKey = this.itemNum++;
        const node = new Node(`_${nodeKey}`);
        node.parent = container;
        const source = node.addComponent(AudioSource);
        source.clip = option.clip;
        const ctor = clazz??AudioCache;
        const cache = new ctor(nodeKey, source);
        cache.setup(manager, option);
        if (option.expireMs > 0)
            ResKeeper.register(node, option.clip);
        else
            option.clip.addRef();
        return cache as T;
    }
}

class MusicPlayer extends CorePlayer {
    private _caches = new HashList<MusicCache>();
    private _cur: MusicCache;
    private _tween: Tween<MusicTweenHelper>;

    constructor(manager: AudioManager) {
        super(manager, "MusicPlayer");
    }

    play(manager: AudioManager, option: PlayAudioOption) {
        const {
            clip
        } = option;
        let cur = this._cur;
        if (cur?.clipUuid == clip.uuid) {
            this.resume();
            return;
        }
        const switchMode = option.musicSwitchMode??"instant";
        if (switchMode == "instant" || switchMode == 'ease') {
            cur?.source.stop();
            if (!isValid(option.clip))
                return;
            const next = this._cur = this._getCache(manager, option);
            next.play();
        } else {
            // todo 真机上用渐入渐出会造成音乐不播放，修复这个问题之后再使用
            if (this._tween != void 0) {
                this._tween.stop();
                this._tween = null;
            }
            const helper = new MusicTweenHelper();
            const next = this._cur = this._getCache(manager, option);
            const tween = this._tween = new Tween(helper);
            if (cur != void 0)
                tween.call(() => helper.target = cur)
                    .to(0.5, { volumeRate: 0.1 })
                    .call(() => cur.stop());
            tween.call(() => helper.target = next)
                .call(() => next.play())
                .set({ volumeRate: 0.1 })
                .to(1.5, { volumeRate: 1 })
                .call(() => this._tween = null)
                .start();
        }
    }

    stop() {
        this._cur?.stop();
    }

    resume() {
        if (this._cur != void 0 && !this._cur.source.playing)
            this._cur.source.play();
    }

    onVolumeScaleChange(manager: AudioManager, oldScale: number, curScale: number) {
        this._caches.forEach(v => v.onVolumeScaleChanged(manager, oldScale, curScale));
    }

    autoClear() {
        const curTime = game.totalTime;
        this._caches.forEach(v => {
            if (v.isOverdue(curTime)) {
                this._caches.del(v.clipUuid);
                v.source.node.destroy();
            }
        });
    }

    private _getCache(manager: AudioManager, option: PlayAudioOption) {
        let cache = this._caches.get(option.clip.uuid);
        if (cache == void 0)
            cache = this.createCache(manager, option, MusicCache);
        else
            cache.setup(manager, option);
        this._caches.add(cache.clipUuid, cache);
        return cache;
    }
}

class SingleEffectPlayer extends CorePlayer {
    private _totalPlaying: number = 0;
    private _maxPlaying: number = 1;
    private _caches = new HashList<AudioCache>();

    constructor(manager: AudioManager) {
        super(manager, "SingleEffectPlayer");
    }

    play(manager: AudioManager, option: PlayAudioOption) {
        if (this._totalPlaying >= this._maxPlaying)
            return;
        if (!isValid(option.clip))
            return;
        let cache = this._caches.get(option.clip.uuid);
        if (cache) {
            cache.setup(manager, option);
            cache.play();
        }
        else {
            const cache = this.createCache(manager, option);
            this._caches.add(cache.clipUuid, cache);
            cache.onEnd = this._onEnd.bind(this);
            cache.play();
        }
        ++this._totalPlaying;
    }

    stop() {
        this._caches.forEach(v => v.playing&&v.stop());
    }

    onVolumeScaleChange(manager: AudioManager, oldScale: number, curScale: number) {
        this._caches.forEach(v => v.onVolumeScaleChanged(manager, oldScale, curScale));
    }

    autoClear() {
        const curTime = game.totalTime;
        this._caches.forEach(v => {
            if (v.isOverdue(curTime)) {
                this._caches.del(v.clipUuid);
                v.source.node.destroy();
            }
        });
    }

    private _onEnd(cache: AudioCache) {
        this._totalPlaying = Math.max(0, this._totalPlaying-1);
    }
}

class EffectPlayer extends CorePlayer {
    private _totalPlaying: number = 0;
    declare private _maxPlaying: number;
    private _allCaches: Record<string, { freeIndice: number[], freeIndiceDic: Set<number>, list: HashList<AudioCache> }> = {};
    declare private _onEndBinding: <T extends AudioCache>(cache: T) => void;

    constructor(manager: AudioManager, maxPlaying: number) {
        super(manager, "EffectPlayer");
        this._maxPlaying = maxPlaying;
        this._onEndBinding = this._onEnd.bind(this);
    }

    play(manager: AudioManager, option: PlayAudioOption) {
        if (this._totalPlaying >= this._maxPlaying)
            return;
        if (!isValid(option.clip))
            return;
        let caches = this._allCaches[option.clip.uuid];
        if (caches == void 0)
            caches = this._allCaches[option.clip.uuid] = {
                freeIndice: [],
                freeIndiceDic: new Set(),
                list: new HashList()
            };
        if (caches.freeIndice.length > 0) {
            const cache = caches.list.get(caches.freeIndice.pop());
            caches.freeIndiceDic.delete(cache.key);
            cache.setup(manager, option);
            cache.onEnd = this._onEndBinding;
            cache.play();
        } else {
            const cache = this.createCache(manager, option);
            caches.list.add(cache.key, cache);
            cache.onEnd = this._onEndBinding;
            cache.play();
        }

        ++this._totalPlaying;
    }

    stop() {
        for (const k in this._allCaches) {
            const { list, freeIndice, freeIndiceDic } = this._allCaches[k];
            freeIndice.length = 0;
            freeIndiceDic.clear();
            list.forEach(v => {
                if (v.playing)
                    v.stop();
                freeIndiceDic.add(v.key);
                freeIndice.push(v.key);
            });
        }
        this._totalPlaying = 0;
    }

    onVolumeScaleChange(manager: AudioManager, oldScale: number, curScale: number) {
        for (const k in this._allCaches) {
            this._allCaches[k].list.forEach(v => {
                v.onVolumeScaleChanged(manager, oldScale, curScale);
            });
        }
    }

    autoClear() {
        const curTime = game.totalTime;
        for (const k in this._allCaches) {
            const { list, freeIndice, freeIndiceDic } = this._allCaches[k];
            let changed = false;
            for (let i = 0, len = freeIndice.length; i < len; ++i) {
                const cache = list.get(freeIndice[i]);
                if (cache.isOverdue(curTime)) {
                    changed = true;
                    list.del(freeIndice[i]);
                    freeIndiceDic.delete(freeIndice[i]);
                    freeIndice[i] = -1;
                    cache.source.node.destroy();
                }
            }
            if (changed)
                arrayRemove(freeIndice, -1);
        }
    }

    private _onEnd(cache: AudioCache) {
        delete cache.onEnd;
        const caches = this._allCaches[cache.clipUuid];
        // 暂时存在了重复添加freeIndex的情况，但未知错误时在哪里触发
        // 这个地方通过集合来规避掉这种情况
        if (caches.freeIndiceDic.has(cache.key))
            return;
        caches.freeIndice.push(cache.key);
        caches.freeIndiceDic.add(cache.key);
        this._totalPlaying = Math.max(0, this._totalPlaying - 1);
    }
}

class AudioCache {
    key: number;
    clipName: string;
    clipUuid: string;
    source: AudioSource;
    lastPlayTime: number = 0;
    expireMs: number = 0;
    volumeScale: number = 1;
    onEnd?: (cache: AudioCache) => void;

    get playing() { return this.source.playing; }

    constructor(key: number, source: AudioSource) {
        this.key = key;
        this.clipName = source.clip.name;
        this.clipUuid = source.clip.uuid;
        this.source = source;
        this.source.node.on(
            AudioSource.EventType.ENDED,
            this._onAudioEnd,
            this
        );
    }

    play() {
        this.source?.play();
        this.lastPlayTime = game.totalTime;
    }

    stop() {
        this.source?.stop();
    }

    onVolumeScaleChanged(manager: AudioManager, oldScale: number, curScale: number) {
        this.source.volume = this.calcScaledVolume(manager, oldScale, curScale);
    }

    setup(manager: AudioManager, option: PlayAudioOption) {
        this.source.loop = option.loop??false;
        this.source.volume = manager.getTrueVolume(option.volume??1);
        this.expireMs = option.expireMs??0;
    }

    isOverdue(curTime: number) {
        return this.expireMs > 0 &&
            !this.playing &&
            curTime - this.lastPlayTime >= this.expireMs;
    }

    protected calcScaledVolume(manager: AudioManager, oldScale: number, curScale: number) {
        let scaledVolume = this.source.volume;
        let originVolume: number;
        if (gMath.almostEqual(curScale, 0))
            originVolume = 0;
        else
            originVolume = scaledVolume/curScale;
        return manager.getTrueVolume(originVolume);
    }

    private _onAudioEnd() {
        this.onEnd?.call(this, this);
    }
}

class MusicCache extends AudioCache {
    stableVolume = 1;

    onVolumeScaleChanged(manager: AudioManager, oldScale: number, curScale: number) {
        const volume = this.calcScaledVolume(manager, oldScale, curScale);
        this.source.volume = volume;
        this.stableVolume = volume;
    }

    setup(manager: AudioManager, option: PlayAudioOption) {
        super.setup(manager, option);
        this.stableVolume = this.source.volume;
        this.source.playOnAwake = true;
    }
}

class MusicTweenHelper {
    target: MusicCache;

    private _volumeRate: number = 1;
    get volumeRate() { return this._volumeRate; }
    set volumeRate(value: number) {
        const isplaying = this.target.source.playing;
        value = gMath.clamp(value, 0, 1);
        // this._volumeRate = value;
        if (!isplaying)
            return;
        this._volumeRate = value;
        this.target.source.volume = value * this.target.stableVolume;
    }
}