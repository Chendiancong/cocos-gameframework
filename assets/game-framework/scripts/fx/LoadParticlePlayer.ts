import { Node, Prefab, instantiate } from "cc";
import { ParticlePlayer } from "./ParticlePlayer";
import { ResKeeper } from "../res/ResKeeper";
import { defer } from "../base/promise";
import { escapePoolManager } from "../base/ObjectPool";
import { particlePlayerMgr } from "./ParticlePlayerMgr";
import { getOrAddComponent } from "../utils/util";

@escapePoolManager
export class LoadParticlePlayer implements gFramework.IPoolItem, gFramework.IPlayableListener<ParticlePlayer> {
    private _player: ParticlePlayer;
    private _rootNode: Node;
    private _url: string;
    private _pending: gFramework.PromiseDefer<ParticlePlayer>;
    private _listener: gFramework.IPlayableListener<LoadParticlePlayer>;
    private _isPoolObj: boolean;

    get rootNode() { return this._rootNode; }
    get player() { return this._player; }
    get url() { return this._url; }
    get pending() { return this._pending.promise; }
    get ready() { return this._player?.isValid; }

    static createFromPool(url: string) {
        const item = particlePlayerMgr.getItem(url);
        item._isPoolObj = true;
        return item;
    }

    static create(url: string) {
        const item = particlePlayerMgr.newOne(url);
        item._isPoolObj = false;
        return item;
    }

    constructor(url: string) {
        this._url = url;
        this._pending = defer<ParticlePlayer>();
        this._rootNode = new Node('$ParticlePlayerLoader');
        this._load();
    }

    setParent(...args: Parameters<Node['setParent']>) {
        return this._rootNode.setParent(...args);
    }

    setListener(listener: LoadParticlePlayer['_listener']) {
        this._listener = listener;
    }

    play() {
        this.pending.then(p => p.play());
    }

    pause() {
        this.pending.then(p => p.pause());
    }

    stop() {
        this.pending.then(p => p.stop());
    }

    stopImmedietely() {
        this.pending.then(p => p.stopImmediately());
    }

    onPoolCreate() { }

    onPoolReuse() { }

    onPoolRestore() {
        this._listener = void 0;
        this._rootNode.parent = null;
    }

    onPoolDispose() { }

    onTargetPlay(_: ParticlePlayer) {
        this._listener?.onTargetPlay?.call(this._listener, this);
    }

    onTargetPause(_: ParticlePlayer) {
        this._listener?.onTargetPause?.call(this._listener, this);
    }

    onTargetWillStop(_: ParticlePlayer) {
        this._listener?.onTargetWillStop?.call(this._listener, this);
    }

    onTargetStop(_: ParticlePlayer) {
        this._listener?.onTargetStop?.call(this._listener, this);
        if (this._isPoolObj)
            particlePlayerMgr.pushItem(this);
    }

    private async _load() {
        const prefab = await gFramework.resMgr.aloadRes<Prefab>(this._url);
        const node = instantiate(prefab);
        ResKeeper.register(node, prefab);
        node.setPosition(0, 0, 0);
        node.parent = this._rootNode;
        this._player = getOrAddComponent(node, ParticlePlayer);
        gFramework.assert(this._player?.isValid);
        this._player.setListener(this);
        this._pending.resolve(this._player);
    }
}