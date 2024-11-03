import { Asset, assetManager, AssetManager, Constructor, js, resources } from "cc";
import { DEBUG } from "cc/env";
import { UIConfig } from "fairygui-cc";
import { fgui } from "../base/base";
import { debugUtil } from "../base/debugUtil";
import { defer, promisify } from "../base/promise";

export interface LoadResArgs {
    url?: string;
    urls?: string[];
    type?: typeof Asset;
    bundle?: AssetManager.Bundle;
    onCompleted?: LoadCompleteCallback<Asset>;
    onProgess?: LoadProgressCallback;
}

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

    private _bundle: AssetManager.Bundle = resources;
    private _fpkgConfig: IFpkgConfig;
    private _bundles: Map<string, AssetManager.Bundle> = new Map();
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
        UIConfig.defaultBundle = this._bundle = this._bundles.get(bundleName) ?? this._bundle;
    }

    getBundle(bundleName?: string) {
        return !!bundleName ? this._bundles.get(bundleName) : this._bundle;
    }

    setFPkgConfig(config: IFpkgConfig) {
        this._fpkgConfig = config;
    }

    getFPkgConfig() {
        return this._fpkgConfig;
    }

    getRes<T>(path: string, type: Constructor<T>): T;
    getRes(path: string, type: typeof Asset) {
        return this._bundle.get(path, type);
    }

    private _errorTimes: Record<string, number> = Object.create(null);
    private _noMoreLoad: Record<string, boolean> = Object.create(null);
    loadRes<T>(url: string,
        type?: typeof Asset,
        bundle?: AssetManager.Bundle,
        progressCallback?: LoadProgressCallback,
        completeCallback?: LoadCompleteCallback<Asset>
    ) {
        if (this._noMoreLoad[url]) {
            throw new Error(`${url} is unreachable`);
        }
        let resArgs: LoadResArgs = ResMgr.makeLoadResArgs.apply(
            this,
            arguments
        );
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
            if (completeCallback) completeCallback(error, resource);
        };

        (resArgs.bundle ?? this._bundle).load(
            resArgs.url,
            resArgs.type,
            resArgs.onProgess,
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
        let resArgs: LoadResArgs = ResMgr.makeLoadResArgs.apply(
            this,
            arguments
        );
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
        (resArgs.bundle ?? this._bundle).loadDir(
            resArgs.url,
            resArgs.type,
            resArgs.onProgess,
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
        let resArgs: LoadResArgs = ResMgr.makeLoadResArgs.apply(
            this,
            arguments
        );
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
        (resArgs.bundle ?? this._bundle).load(
            resArgs.urls,
            resArgs.type,
            resArgs.onProgess,
            finishCallback
        );
    }

    aloadRes: <T extends Asset = Asset>(url: string, type?: Constructor<T>, bundle?: AssetManager.Bundle, onProgress?: LoadProgressCallback, onFinish?: LoadCompleteCallback<Asset>) => Promise<T> = promisify(this.loadRes.bind(this));
    aloadResDir: <T extends Asset = Asset>(url: string, type?: Constructor<T>, bundle?: AssetManager.Bundle, onProgress?: LoadProgressCallback) => Promise<T[]> = promisify(this.loadResDir.bind(this));
    aloadResArray: <T extends Asset>(urls: string[], type?: Constructor<T>, bundle?: AssetManager.Bundle, onProgess?: LoadProgressCallback) => Promise<T[]> = promisify(this.loadResArray.bind(this));

    private _finishItem(asset: Asset | fgui.UIPackage, url: string) {
        // this.autoReleasePool.add(asset, url);
    }

    private _loadingPkg: { [name: string]: any[] } = Object.create(null);

    loadFPkg(name: string, onCompleted?: (err: Error, pkg: fgui.UIPackage) => void) {
        let pkg = this.getFPkg(name);
        if (pkg) {
            this._finishItem(pkg, pkg.path);
            if (onCompleted) onCompleted(null, pkg);
            return;
        }

        if (this._loadingPkg[name]) {
            if (onCompleted) this._loadingPkg[name].push(onCompleted);
            return;
        }
        if (onCompleted) this._loadingPkg[name] = [onCompleted];
        this.loadSinglePkg(name, (err, pkg) => {
            if (!err) {
                let deps = pkg.dependencies;
                if (DEBUG) {
                    console.log("####当前加载包## " + name);
                    let dependNames = deps.map(dep => dep.name);
                    if (this.checkIsResidentPkg(name)) {
                        if (!!dependNames.length) {
                            console.log("#### =========依赖=========  ");
                            console.log("####" + dependNames.join(" , "));
                            console.log("#### =======================");
                        } else {
                            console.log("#### =======" + name + "  √无依赖");
                        }
                    } else {
                        let flag = false;
                        dependNames.forEach((n => {
                            if (!this.checkIsResidentPkg(n)) {
                                flag = true;
                                gFramework.log("####注意!! " + name + "  引用关联包-->" + n + " 可能有误，请检查fgui文件");
                            }
                        }));
                        if (!flag) console.log("#### =======" + name + "  √无依赖");
                    }
                }
                if (pkg.name.toLocaleLowerCase().startsWith("common")) {
                    // 特殊处理，文本图片问题!
                    pkg.initLoadImagesAssets();
                }
                //////////////////////////////
                if (deps && deps.length > 0) {
                    this.loadPkgDependencies(deps, (err) => {
                        if (!err)
                            this._finishItem(pkg, pkg.path);
                        if (this._loadingPkg[name]) {
                            this._loadingPkg[name].forEach(cb => cb(err, pkg));
                            this._loadingPkg[name] = null;
                        }
                    });
                    return;
                }
                this._finishItem(pkg, pkg.path);
            }
            if (this._loadingPkg[name]) {
                this._loadingPkg[name].forEach(cb => cb(err, pkg));
                this._loadingPkg[name] = null;
            }
        });
    }

    private loadSinglePkg(name: string, onCompleted: (err: Error, pkg: fgui.UIPackage) => void) {
        let pkg = this.getFPkg(name);
        if (!!pkg) {
            onCompleted(null, pkg);
        } else {
            fgui.UIPackage.loadPackage(this._bundle, this.getFPkgUrl(name), onCompleted);
        }
    }

    private loadPkgDependencies(dependencies: Array<{ id: string, name: string }>, onCompleted: (err: Error) => void) {
        let _err: Error = null;
        let count = dependencies.length;
        let pkgCompleted = function (err: Error) {
            count--;
            if (!_err) _err = err;
            if (count == 0) {
                onCompleted(_err);
            }
        }
        for (let i = 0, il = count, name: string, pkg: fgui.UIPackage; i < il; i++) {
            name = dependencies[i].name;
            pkg = this.getFPkg(name);
            if (pkg) {
                pkg.addRef();
                pkgCompleted(null);
            }
            else {
                this.loadSinglePkg(name, (err, pkg) => {
                    pkg.addRef();
                    let deps = pkg.dependencies;
                    if (deps && deps.length > 0)
                        this.loadPkgDependencies(deps, pkgCompleted);
                    else
                        pkgCompleted(err);
                });
            }
        }
    }

    aloadFPkg: (name: string) => Promise<fgui.UIPackage> = promisify(this.loadFPkg.bind(this));

    /**  preload pkg  */
    preloadFPk(pkgName: string) {
        if (DEBUG) gFramework.log("#### preload pkg " + pkgName);
        return fgui.UIPackage.preloadPackage(
            this.getFPkgUrl(pkgName),
            this._bundle
        );
    }

    /**  tryLoadAloneImagePackage  */
    tryLoadAloneImagePackage(pkgName: string) {
        if (DEBUG) gFramework.log("#### tryLoadAloneImagePackage pkg " + pkgName);
        return fgui.UIPackage.tryLoadAloneImagePackage(
            this.getFPkgUrl(pkgName)
        ).then((result: string[]) => {
            if (DEBUG && result && result.length) {
                gFramework.log("#### tryLoadAloneImagePackage pkg " + pkgName + "  size:" + result.length);
            }
        });
    }

    loadUuid<T extends Asset>(uuid: string): Promise<T> {
        return ResMgr.loadUuid<T>(uuid);
    }
    ////////////////////////////////////////

    getFPkg(name: string) {
        return fgui.UIPackage.getByName(name);
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
        fgui.UIPackage.removeAllPackage();
    }

    reset() {
        this._bundle = resources;
        // this.autoReleasePool.reset();
        // fgui.UIPackage.removeAllPackage();
    }

    free() {
        ///setTimeout(() => this.autoReleasePool.free());
    }

    static makeLoadResArgs(): LoadResArgs {
        if (arguments.length < 1) {
            debugUtil.error(`makeLoadResArgs error ${arguments}`);
            return null;
        }

        let ret: LoadResArgs = {};
        if (typeof arguments[0] === "string") {
            ret.url = arguments[0];
        } else if (Array.isArray(arguments[0])) {
            ret.urls = arguments[0];
        } else {
            debugUtil.error(`makeLoadResArgs error ${arguments}`);
            return null;
        }

        for (let i = 1; i < arguments.length; ++i) {
            if (i === 1 && js.isChildClassOf(arguments[i], Asset)) {
                ret.type = arguments[i];
            } else if (i === 2 && arguments[i] instanceof AssetManager.Bundle) {
                ret.bundle = arguments[i];
            } else if (typeof arguments[i] === "function") {
                if (i < arguments.length - 1 &&
                    typeof arguments[i + 1] === "function"
                ) {
                    ret.onProgess = arguments[i];
                } else {
                    ret.onCompleted = arguments[i];
                }
            }
        }

        return ret;
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

    public checkIsResidentPkg(pkgName: string) {
        if (!pkgName) return false;
        return !!UIConfig.residentPkgKeys.find((key) => {
            let checkStr = pkgName.toLocaleLowerCase();
            return checkStr.startsWith(key) || checkStr.endsWith(key);
        });
    }

}