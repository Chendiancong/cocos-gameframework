import { Asset, assetManager, BufferAsset, CCObject, Component, instantiate, isValid, Node, Prefab, sp, Texture2D, _decorator } from "cc";
import { ResKeeper } from "../../res/ResKeeper";
import { aspects } from "../Aspects";
import { SpineSocketBranch } from "./SpineSocketBranch";
import { SpineSocketRoot } from "./SpineSocketRoot";
import { getOrAddComponent } from "../util";
import { injectFixJSB } from "game-framework/scripts/engine/3_8_1_InjectFixJSB";

const { checkEditor } = aspects;

const { ccclass, property, executeInEditMode } = _decorator;

function analyzeAtlasForTextureNames(content: string) {
    const reg = /\n(.+)\.(png|jpg)\n/g;
    const matcher = content.match(reg);
    const names: string[] = [];
    if (matcher && matcher.length) {
        console.log('atlas texture names:');
        for (let i = 0, len = matcher.length; i < len; ++i) {
            let nextName = matcher[i].substring(1, matcher[i].length - 1);
            console.log(nextName);
            names.push(nextName);
        }
    }
    return names;
}

@ccclass('SpineTexture')
export class SpineTexture {
    @property({ type: Texture2D, displayName: '纹理资源' })
    get texture() { return this._texture; }
    set texture(t: Texture2D) {
        this._texture = t;
        this.root['_onAssetUpdate']();
    }
    @property({ displayName: '纹理名称', readonly: true })
    textureName: string = '';

    @property({ type: Texture2D, serializable: true })
    private _texture: Texture2D = null;

    get isValid() {
        return isValid(this._texture) && !!this.textureName;
    }

    root: CustomSpineAsset;
}

@ccclass('CustomSpineAsset.SpineSocket')
export class MySpineSocket {
    @property({ readonly: true })
    path: string;
    @property(Prefab)
    get prefab() { return this._prefab; }
    set prefab(value: Prefab) {
        this._prefab = value;
        if (isValid(value))
            this._prefabUuid = value.uuid;
    }

    @property({ visible: true, readonly: true })
    private _prefabUuid: string;
    get prefabUuid() { return this._prefabUuid; }

    private _prefab: Prefab;

    @aspects.editor
    loadPrefab() {
        if (this._prefabUuid) {
            assetManager.loadAny(
                this._prefabUuid,
                void 0,
                (err, data) => {
                    if (err)
                        throw err;
                    this.prefab = data;
                }
            );
        }
    }
}

@ccclass("CustomSpineAsset")
@executeInEditMode
export class CustomSpineAsset extends Component {
    @property({ range: [1, 4] })
    scale: number = 1;
    @property
    skinName: string = '';
    @property
    animationName: string = '';
    @property
    loop: boolean = true;
    @property
    premultipliedAlpha: boolean = true;
    @property
    useTint: boolean = false;

    @property({ displayName: '是否使用混合骨骼', visible: true })
    private _useMixske: boolean = true;

    @property({ type: Asset, displayName: 'MixSkeletonData', visible: function () { return this._useMixske } })
    private get __mixskeData() { return this._skeData; }
    private set __mixskeData(value: Asset) {
        if (checkEditor()) {
            this._skeData = value;
            this._onAssetUpdate();
        }
    }

    @property({ type: sp.SkeletonData, displayName: 'SkeletonData', visible: function() { return !this._useMixske } })
    private get __skeData() { return this._skeData as sp.SkeletonData; }
    private set __skeData(value: sp.SkeletonData) {
        if (checkEditor()) {
            this._skeData = value;
            this._onAssetUpdate();
        }
    }

    @property({ type: Asset, visible: true })
    private get __atlasData() { return this._atlasData; }
    private set __atlasData(value: Asset) {
        if (checkEditor()) {
            this._atlasData = value;
            if (isValid(value)) {
                const names = analyzeAtlasForTextureNames(value._nativeAsset);
                this._textures = [];
                for (const n of names) {
                    const t = new SpineTexture();
                    t.root = this;
                    t.textureName = n;
                    this._textures.push(t);
                }
            } else {
                this._textures = [];
            }
            this._onAssetUpdate();
        }
    }

    @property({ type: [SpineTexture], visible: true, serializable: true, readonly: true })
    private _textures: SpineTexture[] = [];

    @property({ type: [MySpineSocket], visible: true, serializable: true, readonly: true })
    private _sockets: MySpineSocket[] = [];

    @property({ visible: true })
    private get _rebuild() { return false; }
    private set _rebuild(value: boolean) {
        if (value) {
            if (isValid(this._model)) {
                this._model.destroy();
                this._model.parent = void 0;
                this._model = void 0;
            }
            this._onAssetUpdate();
        }
    }

    @property({ visible: true, displayName: '从模型节点加载插槽数据' })
    private get _loadSpineSocket() { return false; }
    private set _loadSpineSocket(value: boolean) {
        if (value) {
            if (isValid(this._model)) {
                const comp = this._model.getComponent(sp.Skeleton);
                if (isValid(comp)) {
                    const sockets = comp.sockets;
                    const oldSocketsDic: Record<string, MySpineSocket> = Object.create(null);
                    for (const s of this._sockets)
                        oldSocketsDic[s.path] = s;
                    const newSockets = [];
                    for (const s of sockets) {
                        const mySocket = new MySpineSocket();
                        mySocket.path = s.path;
                        if (oldSocketsDic[s.path]) {
                            const oldSocket = oldSocketsDic[s.path];
                            mySocket.prefab = oldSocket.prefab;
                        }
                        newSockets.push(mySocket)
                    }
                    this._sockets = newSockets;
                }
            }
        }
    }

    @property({ serializable: true })
    private _skeData: Asset = null;
    @property({ serializable: true })
    private _atlasData: Asset = null;

    private _model: Node;

    private get _texturesValid() {
        for (const t of this._textures) {
            if (!t.isValid)
                return false;
        }
        return true;
    }

    private get _isValid() {
        return isValid(this._skeData) &&
            isValid(this._atlasData) &&
            this._texturesValid;
    }

    onLoad() {
        this._onAssetUpdate();
        if (checkEditor())
            this._sockets.forEach(v => v.loadPrefab());
    }

    private _onAssetUpdate() {
        if (!this._isValid)
            return;

        let node: Node;
        if (isValid(this._model))
            node = this._model;
        else
            node = this._model = new Node("SpineBody");
        node.parent = this.node;
        node.layer = this.node.layer;
        node.setScale(this.scale, this.scale, this.scale);
        if (checkEditor())
            node._objFlags |= CCObject.Flags.DontSave;
        const spine = getOrAddComponent(node, sp.Skeleton);
        const socketRoot = getOrAddComponent(node, SpineSocketRoot);
        const skeleton = new sp.SkeletonData();
        skeleton._uuid = this._skeData.uuid;
        skeleton._nativeUrl = this._skeData.nativeUrl;
        skeleton._nativeAsset = this._skeData._nativeAsset;
        skeleton.atlasText = this._atlasData._nativeAsset;
        skeleton.textures = this._textures.map(v => v.texture);
        skeleton.textureNames = this._textures.map(v => v.textureName);
        this._textures.forEach(v => {
            // 原生平台对合并骨骼图集执行释放后会使得spine动画呈现黑块，原因未知
            // 这里用于阻止对合并骨骼图集的释放
            injectFixJSB.dontRelease(v.texture);
        });
        if (this._sockets.length) {
            // 初始化骨骼插槽
            this._loadSockets(this._sockets)
                .then(loadedSockets => {
                    if (!isValid(spine))
                        return;
                    socketRoot.removeSocketsByPath(spine.sockets.map(s => s.path));
                    const skeletonSockets: sp.SpineSocket[] = [];
                    for (const l of loadedSockets) {
                        const s = new sp.SpineSocket();
                        s.path = l.path;
                        s.target = l.target;
                        l.target.parent = node;
                        skeletonSockets.push(s);
                    }
                    spine.sockets = skeletonSockets;
                    socketRoot.addSockets(skeletonSockets);
                });
        }
        spine.skeletonData = skeleton;
        if (this.skinName)
            spine.setSkin(this.skinName);
        if (this.animationName)
            spine.animation = this.animationName;
        spine.loop = this.loop;
        spine.premultipliedAlpha = this.premultipliedAlpha;
        spine.useTint = this.useTint;
    }

    private async _loadSockets(mySockets: MySpineSocket[]): Promise<{path: string, target: Node}[]> {
        const promises: Promise<({path: string, target: Node}|null)>[] = [];
        for (let i = 0, len = mySockets.length; i < len; ++i) {
            const s = mySockets[i];
            const branchNode = new Node(`Socket:${s.path.replace(/\//g, '_')}`);
            const branch = branchNode.addComponent(SpineSocketBranch);
            branch.path = s.path;
            if (s.prefabUuid) {
                promises.push(new Promise((resolve, _) => {
                    assetManager.loadAny(
                        s.prefabUuid, void 0, void 0,
                        (err, data) => {
                            if (err) {
                                console.error(err);
                            } else {
                                const node = instantiate(data);
                                if (!checkEditor())
                                    ResKeeper.register(node, data);
                                node.parent = branchNode;
                            }
                            resolve({
                                path: s.path,
                                target: branchNode
                            })
                        }
                    )
                }));
            } else
                promises.push(Promise.resolve({ path: s.path, target: null }));
        }
        return await Promise.all(promises);
    }

    private static _inited = false;
    /**
     * 注册特定后缀的资源下载和工厂策略
     */
    static init() {
        if (this._inited)
            return;
        this._inited = true;
        // assetManager.downloader.register(
        //     ".mixskel",
        //     (url: string, options: Record<string, any>, onComplete: ((err: Error | null, data?: any | null) => void)) => {
        //         options.xhrResponseType = "arraybuffer";
        //         assetManager.downloader.downloadFile(url, options, options.onFileProgress, onComplete);
        //     }
        // )
        // assetManager.factory.register(
        //     ".mixskel",
        //     (id: string, data: ArrayBufferView, options: Record<string, any>, onComplete: ((err: Error | null, data?: any | null) => void)) => {
        //         const out = new BufferAsset();
        //         out._nativeUrl = id;
        //         out._nativeAsset = data;
        //         onComplete(null, out);
        //     }
        // )
    }
}

(function register() {
    //注册特定后缀的资源下载和工厂策略
    assetManager.downloader.register(
        ".mixskel",
        (url: string, options: Record<string, any>, onComplete: ((err: Error | null, data?: any | null) => void)) => {
            options.xhrResponseType = "arraybuffer";
            assetManager.downloader.downloadFile(url, options, options.onFileProgress, onComplete);
        }
    );
    /**
     * @deprecated
     * 没有跑到这里来的
     * 实际上大部分native资源并没有使用工厂函数创建Asset，而是在资源加载完成的时候直接用asset._nativeAsset = arraybuffer的方式指定，
     */
    assetManager.factory.register(
        ".mixskel",
        (id: string, data: ArrayBufferView, options: Record<string, any>, onComplete: ((err: Error | null, data?: any | null) => void)) => {
            const out = new BufferAsset();
            out._nativeUrl = id;
            out._nativeAsset = data;
            onComplete(null, data);
        }
    );
})();