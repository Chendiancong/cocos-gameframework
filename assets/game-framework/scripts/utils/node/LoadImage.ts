import { _decorator, AssetManager, assetManager, CCObject, Component, Enum, Node, Sprite, SpriteFrame, UITransform, Widget } from 'cc';
import { ResKeeper } from 'game-framework/scripts/res/ResKeeper';
import { aspects } from '../Aspects';
import { getGlobal } from 'game-framework/scripts/base/base';
const { ccclass, property, executeInEditMode } = _decorator;

function valueChecker<TK extends Keys<LoadImage>>(key: TK, targetVal: LoadImage[TK]) {
    return function (this: LoadImage) {
        return this[key] === targetVal;
    }
}

@ccclass('LoadImage')
@executeInEditMode
export class LoadImage extends Component {
    @property(SpriteFrame)
    get spriteFrame() { return this._spriteFrame; }
    set spriteFrame(value: SpriteFrame) {
        this._spriteFrame = value;
        this._assetUuid = value?.uuid ?? ''
        this._onSpriteFrameUpdate();
    }
    @property({ serializable: true, visible: true, readonly: true })
    private _assetUuid: string = '';
    @property
    useRuntimeUrl: boolean = false;
    @property({ visible: valueChecker('useRuntimeUrl', true), tooltip: 'AssetBundle名称' })
    private _bundle: string = 'resources';
    @property({ visible: valueChecker('useRuntimeUrl', true), tooltip: 'bundle下的相对路径' })
    private _path: string = '';
    @property({ tooltip: '运行时自动大小' })
    runtimeAutoSize: boolean = true;
    @property
    autoLoad: boolean = false;

    private _spriteFrame: SpriteFrame;
    private _internalSprite: Sprite;

    static readonly kImageUrlReg = /^([^:]+):(.*)$/;
    /**
     * 转换图片url，url必须是 '{bundleName}:{bundleUrl}'的形式，
     * 例如在resouces中的资源：resources:xx/xx/xx
     */
    static convertImageUrl(url: string) {
        const matcher = url.match(LoadImage.kImageUrlReg);
        if (matcher) {
            return {
                bundle: matcher[1],
                path: matcher[2]
            };
        } else {
            gFramework.warn(`error image url:${url}, must be "{bundleName}:{bundleUrl}"`);
            return void 0;
        }
    }

    static readonly kResUrlReg1 = /\/spriteFrame$/
    static readonly kResUrlReg2 = /\/*$/;
    static toSpriteFrameUrl(url: string) {
        if (url.search(this.kResUrlReg1) < 0)
            url = `${url.replace(this.kResUrlReg2, '')}/spriteFrame`;
        return url;
    }

    /**
     * 设置图片url，url必须是 '{bundleName}:{bundleUrl}'的形式，
     * 例如在resouces中的资源：resources:xx/xx/xx
     */
    setImageUrl(imageUrl: string) {
        const converted = LoadImage.convertImageUrl(imageUrl);
        if (converted) {
            this.setPath(converted.bundle, converted.path);
        }
    }

    setPath(bundle: string, path: string) {
        if (this._bundle === bundle && this._path === path)
            return;
        this._bundle = bundle;
        this._path = path;
        this._loadPath();
    }

    setSprite(sprite: SpriteFrame) {
        this.spriteFrame = sprite;
    }

    loadAsset() {
        if (aspects.checkEditor()) {
            if (this._assetUuid)
                this._loadUuid();
            else
                this.spriteFrame = void 0;
        } else if (this.autoLoad) {
            do {
                if (this.useRuntimeUrl) {
                    if (this._bundle && this._path) {
                        this._loadPath();
                        break;
                    }
                }
                if (this._assetUuid)
                    this._loadUuid();
            } while (false);
        }
    }

    protected start() {
        this.loadAsset();
    }

    private async _loadPath() {
        if (getGlobal().gFramework?.resMgr)
            await this.__loadUrlWithGameFramework();
        else
            await this.__loadUrlWithAssetManager();
    }

    private _loadedBundle: string;
    private _loadedPath: string;
    private async __loadUrlWithGameFramework() {
        const {
            _bundle: bundle,
            _path: path
        } = this;
        if (this._loadedBundle === bundle && this._loadedPath === path)
            return;
        await gFramework.resMgr.aloadBundle(this._bundle);
        const asset = await gFramework.resMgr.aloadRes<SpriteFrame>(LoadImage.toSpriteFrameUrl(path));
        if (this._bundle !== bundle || this._path !== path) {
            asset.decRef();
            return;
        }
        this._loadedBundle = bundle;
        this._loadedPath = path;
        if (!aspects.checkEditor())
            ResKeeper.register(this.node, asset);
        this.spriteFrame = asset;
    }

    private async __loadUrlWithAssetManager() {
        const {
            _bundle: bundle,
            _path: path
        } = this;
        let assetBundle = assetManager.getBundle(bundle);
        if (!assetBundle)
            assetBundle = await new Promise<AssetManager.Bundle>((resolve, reject) => {
                assetManager.loadBundle(bundle, void 0, (err, data) => {
                    if (err)
                        reject(err);
                    else
                        resolve(data);
                });
            });
        const asset = await new Promise<SpriteFrame>((resolve, reject) => {
            assetBundle.load<SpriteFrame>(LoadImage.toSpriteFrameUrl(path), (err, data) => {
                if (err)
                    reject(err);
                else
                    resolve(data);
            })
        });
        if (this._bundle !== bundle || this._path !== path) {
            asset.decRef();
            return;
        }
        this._loadedBundle = bundle;
        this._loadedPath = path;
        if (!aspects.checkEditor())
            ResKeeper.register(this.node, asset);
        this.spriteFrame = asset;
    }

    private _loadedUuid: string;
    private async _loadUuid() {
        const uuid = this._assetUuid;
        if (!uuid) {
            this.spriteFrame = void 0;
            return;
        }
        if (this._loadedUuid === uuid)
            return;
        assetManager.loadAny<SpriteFrame>(
            uuid,
            (err, data) => {
                if (err)
                    throw err;
                if (this._assetUuid !== uuid) {
                    data.decRef();
                    return;
                }
                if (!aspects.checkEditor())
                    ResKeeper.register(this.node, data);
                this.spriteFrame = data;
                this._loadedUuid = uuid;
            }
        )
    }

    private _onSpriteFrameUpdate() {
        if (!this._internalSprite?.isValid) {
            const node = new Node('$InternalSprite');
            node.parent = this.node;
            node.layer = this.node.layer;
            this._internalSprite = node.addComponent(Sprite);
            if (aspects.checkEditor()) {
                const Flags = CCObject.Flags;
                node._objFlags |= Flags.DontSave | Flags.LockedInEditor;
            }
            const widget = node.addComponent(Widget);
            widget.isAlignLeft = widget.isAlignRight = widget.isAlignBottom = widget.isAlignTop = true;
            widget.left = widget.right = widget.bottom = widget.top = 0;
            widget.alignMode = Widget.AlignMode.ALWAYS;

            {
                // reflect
                const f = this._internalSprite['_applySpriteSize'] as Function;
                const that = this;
                this._internalSprite['_applySpriteSize'] = function (this: Sprite) {
                    if (!aspects.checkEditor() && !that.runtimeAutoSize)
                        // 运行时固定大小
                        return;
                    f.call(this);
                    that.getComponent(UITransform)
                        .setContentSize(this.getComponent(UITransform).contentSize);
                    const widget = this.getComponent(Widget);
                    widget.left = widget.right = widget.bottom = widget.top = 0;
                }
            }
        }

        this._internalSprite.spriteFrame = this._spriteFrame;
    }
}