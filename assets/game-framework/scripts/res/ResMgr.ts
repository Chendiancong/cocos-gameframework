import { Asset, assetManager, AssetManager, Constructor, resources } from "cc";
import { UIPackage } from "fairygui-cc";
import { fgui } from "../base/base";
import { defer, promisify } from "../base/promise";
import { UIPackageHelper } from "../utils/fgui-extends/FguiExtendsHelper";
import { classMeta } from "../utils/Meta";

export type LoadCompleteCallback<T> = (
    error: Error | null | undefined,
    asset?: T | T[]
) => void;

export type LoadProgressCallback = (
    completedCount: number,
    totalCount: number,
    item: any
) => void;

interface IFpkgConfig {
    directory: string;
    branchDirectory?: string;
}

function defaultBundleLoader(this: ResMgr, bundleName: string): Promise<AssetManager.Bundle> {
    const loader = defer<AssetManager.Bundle>();
    assetManager.loadBundle(
        bundleName,
        function (err: Error, data: AssetManager.Bundle) {
            if (err != void 0)
                loader.reject(err);
            else
                loader.resolve(data);
        }
    )
    return loader.promise;
}

export class ResMgr {
    readonly defaultBundleLoader = defaultBundleLoader;

    private _defaultBundle: AssetManager.Bundle = resources;
    private _bundles: Map<string, AssetManager.Bundle> = new Map();
    private _fpkgConfig: IFpkgConfig;
    private _specificBundleLoader: (bundleName: string) => Promise<AssetManager.Bundle>;

    constructor() {
        this._fpkgConfig = {
            directory: "fgui"
        };
    }

    setSpecificBundleLoader(func: (bundleName: string) => Promise<AssetManager.Bundle>) {
        this._specificBundleLoader = func;
    }

    async aloadBundle(bundleName: string) {
        if (this._bundles.has(bundleName))
            return Promise.resolve(this._bundles.get(bundleName));

        let bundle: AssetManager.Bundle;
        if (this._specificBundleLoader != void 0)
            bundle = await this._specificBundleLoader(bundleName);
        if (bundle == void 0)
            bundle = await this.aloadBundleWithVersion(bundleName, "");

        if (bundle != void 0)
            this._bundles.set(bundleName, bundle);
        return bundle;
    }

    async aloadBundleWithVersion(bundleName: string, bundleVer: string) {
        const loader = defer<AssetManager.Bundle>();
        assetManager.loadBundle(
            bundleName, { version: bundleVer },
            function (err: Error, data: AssetManager.Bundle) {
                if (err != void 0)
                    loader.reject(err);
                else
                    loader.resolve(data);
            }
        )
        return loader.promise;
    }

    setDefaultBundle(bundleName: string) {
        this._defaultBundle = this._bundles.get(bundleName) ?? this._defaultBundle;
    }

    getBundle(bundleName?: string) {
        return !!bundleName ? this._bundles.get(bundleName) : this._defaultBundle;
    }

    setFPkgConfig(config: IFpkgConfig) {
        this._fpkgConfig = config;
    }

    getFPkgConfig() {
        return this._fpkgConfig;
    }

    getRes<T>(path: string, type: Constructor<T>): T;
    getRes(path: string, type: typeof Asset) {
        return this._defaultBundle.get(path, type);
    }

    private _errorTimes: Record<string, number> = Object.create(null);
    private _noMoreLoad: Record<string, boolean> = Object.create(null);
    loadRes<T extends Asset>(url: string,
        type?: Constructor<T>,
        bundle?: AssetManager.Bundle,
        progressCallback?: LoadProgressCallback,
        completeCallback?: LoadCompleteCallback<T>
    ) {
        if (this._noMoreLoad[url]) {
            throw new Error(`${url} is unreachable`);
        }

        let resArgs = new LoadResArgs();
        resArgs
            .set('type', type)
            .set('url', url)
            .set('bundle', bundle)
            .set('onProgress', progressCallback)
            .set('onCompleted', completeCallback);
        let finishCallback = (error: Error, resource: Asset) => {
            if (!error) {
                this._finishItem(resource, resArgs.url);
            }
            if (resArgs.onCompleted) {
                resArgs.onCompleted(error, resource);
            }
            if (!!error) {
                console.error(`load res error, ${url}`);
                const times = (this._errorTimes[url] ?? 0) + 1;
                if (times >= 3) {
                    delete this._errorTimes[url];
                    this._noMoreLoad[url] = true;
                } else
                    this._errorTimes[url] = times;
            }
            if (completeCallback) completeCallback(error, resource as any);
        };

        (resArgs.bundle ?? this._defaultBundle).load(
            resArgs.url,
            resArgs.type,
            resArgs.onProgress,
            finishCallback
        );
    }

    loadResDir(
        url: string,
        type?: typeof Asset,
        bundle?: AssetManager.Bundle,
        progressCallback?: LoadProgressCallback,
        completeCallback?: LoadCompleteCallback<Asset>
    ) {
        const resArgs = new LoadResArgs();
        resArgs
            .set('url', url)
            .set('type', type)
            .set('bundle', bundle ?? this._defaultBundle)
            .set('onProgress', progressCallback)
            .set('onCompleted', completeCallback);
        let finishCallback = (error: Error, resources: Asset[]) => {
            if (!error) {
                for (let resource of resources) {
                    this._finishItem(resource, resArgs.url + "/" + resource.name);
                }
            }
            if (resArgs.onCompleted) {
                resArgs.onCompleted(error, resources);
            }
        };
        (resArgs.bundle ?? this._defaultBundle).loadDir(
            resArgs.url,
            resArgs.type,
            resArgs.onProgress,
            finishCallback
        );
    }

    loadResArray(
        urls: string[],
        type?: typeof Asset,
        bundle?: AssetManager.Bundle,
        progressCallback?: LoadProgressCallback,
        completeCallback?: LoadCompleteCallback<Asset>
    ) {
        const resArgs = new LoadResArgs();
        resArgs
            .set('urls', urls)
            .set('type', type)
            .set('bundle', bundle ?? this._defaultBundle)
            .set('onProgress', progressCallback)
            .set('onCompleted', completeCallback);
        let finishCallback = (error: Error, resources: Asset[]) => {
            if (!error) {
                for (let i = 0, il = resources.length; i < il; i++) {
                    this._finishItem(resources[i], resArgs.urls[i]);
                }
            }
            if (resArgs.onCompleted) {
                resArgs.onCompleted(error, resources);
            }
        };
        (resArgs.bundle ?? this._defaultBundle).load(
            resArgs.urls,
            resArgs.type,
            resArgs.onProgress,
            finishCallback
        );
    }

    aloadRes: <T extends Asset = Asset>(url: string, type?: Constructor<T>, bundle?: AssetManager.Bundle, onProgress?: LoadProgressCallback, onFinish?: LoadCompleteCallback<Asset>) => Promise<T> = promisify(this.loadRes.bind(this));
    aloadResDir: <T extends Asset = Asset>(url: string, type?: Constructor<T>, bundle?: AssetManager.Bundle, onProgress?: LoadProgressCallback) => Promise<T[]> = promisify(this.loadResDir.bind(this));
    aloadResArray: <T extends Asset>(urls: string[], type?: Constructor<T>, bundle?: AssetManager.Bundle, onProgess?: LoadProgressCallback) => Promise<T[]> = promisify(this.loadResArray.bind(this));

    private _finishItem(asset: Asset | fgui.UIPackage, url: string) {
        // this.autoReleasePool.add(asset, url);
    }

    private _loadingPkg: Record<string, any[]> = Object.create(null);
    private _fpkgAssets: Record<string, IFPkgAsset> = Object.create(null);

    loadFPkg(name: string, onCompleted?: (err: Error, asset: IFPkgAsset) => void) {
        const asset = this.getFPkgAsset(name);
        if (asset?.isValid) {
            this._finishItem(asset.pkg, asset.pkg.path);
            if (onCompleted)
                onCompleted(null, asset);
            return;
        }

        if (this._loadingPkg[name]) {
            if (onCompleted)
                this._loadingPkg[name].push(onCompleted);
            return;
        }

        if (onCompleted)
            this._loadingPkg[name] = [onCompleted];

        this._loadSinglePkg(name, (err, asset) => {
            if (err) {
                if (onCompleted)
                    onCompleted(err, null);
                else
                    throw err;
                return;
            }
            this._loadPkgDependices(
                asset,
                _err => {
                    if (!_err)
                        this._finishItem(asset.pkg, asset.pkg.path);
                    if (this._loadingPkg[name]) {
                        const list = this._loadingPkg[name];
                        delete this._loadingPkg[name];
                        list.forEach(cb => cb(_err, asset));
                    }
                }
            )
        });
    }

    private _loadSinglePkg(name: string, onCompleted: (err: Error, asset: IFPkgAsset) => void) {
        const asset = this.getFPkgAsset(name);
        if (!!asset)
            onCompleted(null, asset);
        else
            UIPackage.loadPackage(
                this._defaultBundle,
                this.getFPkgUrl(name),
                (err, pkg) => {
                    if (err) {
                        onCompleted(err, null);
                        return;
                    }
                    let asset = this._fpkgAssets[name]
                    if (!asset)
                        asset = this._fpkgAssets[name] = new _FPkgAsset(this, pkg);
                    onCompleted(err, asset);
                }
            );
    }

    private _loadPkgDependices(root: IFPkgAsset, onCompleted: (err: Error) => void) {
        let err: Error = null;
        const dependencies = root.pkg.dependencies;
        let count = dependencies.length;
        if (count === 0) {
            onCompleted(null);
            return;
        }

        let pkgCompleted = function (_err: Error) {
            count--;
            if (!err)
                err = _err;
            if (count === 0 || err)
                onCompleted(err);
        }

        for (let i = 0, len = count; i < len; ++i) {
            const { name } = dependencies[i];
            const dependentAsset = this._fpkgAssets[name];
            if (dependentAsset) {
                dependentAsset.addRef();
                pkgCompleted(null);
            } else {
                this._loadSinglePkg(name, (err, asset) => {
                    if (err) {
                        pkgCompleted(err);
                        return;
                    }
                    asset.addRef();
                    this._loadPkgDependices(
                        asset,
                        pkgCompleted
                    );
                });
            }
        }
    }

    aloadFPkg: (name: string) => Promise<IFPkgAsset> = promisify(this.loadFPkg.bind(this));

    loadUuid<T extends Asset>(uuid: string): Promise<T> {
        return ResMgr.loadUuid<T>(uuid);
    }

    getFPkgAsset(name: string) {
        const asset = this._fpkgAssets[name];
        if (asset?.isValid)
            return asset;
        else
            return void 0;
    }

    removePkg(name: string) {
        const asset = this._fpkgAssets[name];
        if (asset?.isValid) {
            delete this._fpkgAssets[name];
            asset.release();
        }
    }

    private getFPkgUrl(name: string) {
        const branch = fgui.UIPackage.branch;
        if (branch && this._fpkgConfig.branchDirectory)
            return this._fpkgConfig.branchDirectory + "/" + branch + "/" + name;
        return this._fpkgConfig.directory + "/" + name;
    }

    onRestart() {
        this._bundles.forEach(v => v.releaseAll());
        this._bundles.clear();
        UIPackageHelper.removeAllPackage();
    }

    reset() {
        this._defaultBundle = resources;
        // this.autoReleasePool.reset();
        // fgui.UIPackage.removeAllPackage();
    }

    free() {
        ///setTimeout(() => this.autoReleasePool.free());
    }

    static loadUuid<T extends Asset>(uuid: string): Promise<T> {
        return new Promise(function (resolve, reject) {
            assetManager.loadAny(
                { uuid },
                undefined,
                undefined,
                function (err, data) {
                    if (err)
                        reject(err);
                    else
                        resolve(data);
                }
            )
        });
    }
}

class _FPkgAsset implements gFramework.IRefCountable {
    private _refCount = 0;
    private _pkg: UIPackage;
    private _pkgName: string;
    private _pkgId: string;
    private _resMgr: ResMgr;

    get refCount() { return this._refCount; }
    get pkg() { return this._pkg; }
    get pkgName() { return this._pkgName; }
    get pkgId() { return this._pkgId; }
    get isValid() { return !!this.pkg; }

    constructor(resMgr: ResMgr, pkg: UIPackage) {
        this._resMgr = resMgr;
        this._pkg = pkg;
        this._pkgName = pkg.name;
        this._pkgId = pkg.id;
    }

    addRef() {
        ++this._refCount;
        return this;
    }

    decRef() {
        this._refCount = Math.max(0, this._refCount - 1);
        if (this._refCount <= 0)
            this._resMgr.removePkg(this.pkgName);
        return this;
    }

    release() {
        if (!this.isValid)
            return;

        const pkg = this._pkg;
        delete this._pkg;
        const dependencies = pkg.dependencies;
        const resMgr = this._resMgr;
        for (const { name } of dependencies) {
            const dep = resMgr.getFPkgAsset(name);
            if (dep?.isValid)
                dep.decRef();
        }
        UIPackage.removePackage(this.pkgId);
    }
}

export type IFPkgAsset = _FPkgAsset;

interface ILoadResArgs {
    url: string;
    urls: string[];
    type: Constructor<Asset>,
    bundle: AssetManager.Bundle;
    onCompleted: LoadCompleteCallback<Asset>;
    onProgress: LoadProgressCallback;
}

class LoadResArgs implements ILoadResArgs {
    @classMeta.prop
    url: string;
    @classMeta.prop
    urls: string[];
    @classMeta.prop
    type: Constructor<Asset>;
    @classMeta.prop
    bundle: AssetManager.Bundle;
    @classMeta.prop
    onCompleted: LoadCompleteCallback<Asset>;
    @classMeta.prop
    onProgress: LoadProgressCallback;

    set<K extends keyof ILoadResArgs>(key: K, value: ILoadResArgs[K]) {
        this[key] = value as any;
        return this;
    }

    dispose() {
        classMeta.reset(this);
    }
}