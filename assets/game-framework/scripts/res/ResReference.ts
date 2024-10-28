import { Asset, Prefab, _decorator, assetManager } from 'cc';
import { defer } from '../base/promise';
import { aspects } from '../utils/Aspects';
import { IDelegate, asDelegate } from '../base/Delegate';
import { editorUtil } from '../editor/EditorUtil';

const { ccclass, property } = _decorator;

export type LoadAssetOption = {
    [key: string]: any
} & {
    preset?: string
}

@ccclass('ResReference')
export class ResReference {
    @property(Asset)
    get asset() { return this._asset; }
    set asset(value: Asset) { this._internalSetAsset(value); }
    @property({ serializable: true, readonly: true, visible: true })
    protected _assetUuid: string = '';
    @property({ serializable: true, readonly: true, visible: true, multiline: true })
    protected _assetDBPath: string = '';
    @asDelegate
    onAssetChanged: IDelegate<(asset: Asset) => void>;

    protected _asset: Asset;

    get assetUuid() { return this._assetUuid; }

    loadAsset<T extends Asset = Asset>(loadOption?: LoadAssetOption, onComplete?: (asset: T) => void) {
        if (this._asset?.isValid)
            onComplete?.call(void 0, this._asset);
        if (!this._assetUuid)
            throw new Error('Attempto load empty res reference');
        assetManager.loadAny(
            this._assetUuid,
            loadOption ?? void 0,
            (err, data) => {
                if (err)
                    throw err;
                this._asset = data;
                onComplete?.call(void 0, data);
            }
        )
    }

    protected _pending: Promise<Asset>;
    aloadAsset<T extends Asset = Asset>(loadOption?: LoadAssetOption) {
        if (this._pending)
            return this._pending as Promise<T>;
        const d = defer<Asset>();
        this._pending = d.promise;
        if (!this._assetUuid)
            throw new Error('Attempt to load empty res reference');
        assetManager.loadAny(
            this._assetUuid,
            loadOption ?? void 0,
            (err, data) => {
                if (err) {
                    d.reject(err);
                    return;
                }
                this._internalSetAsset(data);
                d.resolve(data);
            }
        );
        return this._pending as Promise<T>;
    }

    protected _safePending: Promise<Asset>;
    safeLoadAsset<T extends Asset = Asset>(loadOption?: LoadAssetOption) {
        if (this._safePending)
            return this._safePending as Promise<T>;
        const d = defer<Asset>();
        this._safePending = d.promise;
        if (!this._assetUuid)
            d.resolve(void 0);
        else {
            assetManager.loadAny(
                this._assetUuid,
                loadOption ?? void 0,
                (err, data) => {
                    this._internalSetAsset(err ? void 0 : data);
                    d.resolve(this._asset)
                }
            );
        }
        return this._safePending as Promise<T>;
    }

    protected _internalSetAsset(asset: Asset) {
        const lastUid = this._asset?.uuid;
        this._asset = asset;
        this._assetUuid = this._asset?.uuid ?? '';
        if (lastUid !== asset?.uuid)
            this.onAssetChanged.entry(asset);
        if (asset?.uuid && aspects.checkEditor()) {
            const uuid = asset.uuid;
            editorUtil.queryAssetInfo(asset.uuid)
                .then(info => {
                    if (info.uuid !== uuid)
                        return;
                    this._assetDBPath = info.path;
                });
        }
    }
}

@ccclass('ResReference.PrefabReference')
export class PrefabReference extends ResReference {
    @property({ type: Prefab, override: true })
    get asset() { return this._asset as Prefab; }
    set asset(value: Prefab) { this._internalSetAsset(value); }
}