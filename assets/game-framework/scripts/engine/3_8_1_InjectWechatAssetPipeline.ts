import { AssetManager, assetManager, path, resources, settings, sys, VERSION } from "cc"
import { WECHAT } from "cc/env";
import { defer } from "../base/promise";
import { aspects } from "../utils/Aspects";
import { supportVersions } from "./SupportVersions";

/**
 * 定制微信小游戏的资源工作流，
 * 原实现细节见引擎代码platforms/minigame/common/engine/AssetManager.js，与小程序相关的一些适配代码也在那个文件夹里面
 */
function init() {
    aspects.checkEngineVersion(supportVersions._3_8_x, true);
    if (WECHAT) {
        _setupRemoteBundleLoader();
        _setupRemoteBundleHandle();
        _setupBundleVers();
        _setupDownloader();
        _setupParser();
    }
}

function loadBundle(bundleName: string): Promise<AssetManager.Bundle> {
    if (WECHAT && _remoteBundleVers[bundleName] && _remoteBundleLoader)
        return _remoteBundleLoader(bundleName);
    else
        return Promise.resolve(null);
}

function setRemoteBundleVersions(bundleVers: { [name: string]: string }) {
    for (const key in bundleVers)
        _remoteBundleVers[key] = bundleVers[key];
}

function setMd5CacheEnable(flag: boolean) {
    _md5CacheEnable = flag;
}

function isInFileCache(pathInBundle: string, bundle: AssetManager.Bundle = resources) {
    const assetInfo = bundle.getInfoWithPath(pathInBundle);
    if (assetInfo == void 0)
        return false;
    const cacheKey = `${assetInfo.uuid}${assetInfo.ver?`.${assetInfo.ver}`:''}.${assetInfo.extension}`;
    return !!assetManager.cacheManager.cachedFiles.get(cacheKey);
}

export const injectWechatAssetPipeline = {
    init,
    loadBundle,
    setRemoteBundleVersions,
    setMd5CacheEnable,
    isInFileCache
}

let _remoteBundleLoader: (bundleName: string) => Promise<AssetManager.Bundle>;
let _md5CacheEnable: boolean;
const _remoteBundleVers: { [name: string]: string } = {};
const _urlRegex = /^https?:\/\/.*/;

/**
 * 在小程序中，对于配置为远程包的bundle，给与它们一个额外的扩展名remoteBundle
 * 从而对其下载和加载进行干预
 * 目的是正确下载和处理当前资源版本对应的资源描述文件，而不尝试加载包中的代码
 */
function _setupRemoteBundleLoader() {
    _remoteBundleLoader = function (bundleName: string) {
        const d = defer<AssetManager.Bundle>();
        const options: Record<string, any> = {};
        options.preset = "remoteBundle";
        options.ext = "remoteBundle";
        options.__isNative__ = true;
        assetManager.loadAny(
            { url: bundleName },
            options, null,
            (err, data) => {
                if (err)
                    d.reject(err);
                else {
                    assetManager.factory.create(
                        bundleName, data, 'remoteBundle', options,
                        (err, data) => {
                            if (err)
                                d.reject(err);
                            else
                                d.resolve(<AssetManager.Bundle>data);
                        }
                    );
                }
            }
        );
        return d.promise;
    }
}

function _setupBundleVers() {
    const remoteBundles: string[] = settings.querySettings("assets", "remoteBundles");
    const bundleVers: { [key: string]: string } = settings.querySettings("assets", "bundleVers");
    for (const bundleName of remoteBundles) {
        _remoteBundleVers[bundleName] = bundleVers[bundleName];
    }
}

/**
 * 注册关于remoteBundle的下载和工厂策略
 */
function _setupRemoteBundleHandle() {
    const downloader = assetManager.downloader;
    downloader.register(
        "remoteBundle",
        (url: string, options: Record<string, any>, onComplete: ((err: Error|null, data?: any|null) => void)) => {
            //对于remoteBundle，只下载bundle的描述文件，不下载代码
            //相应的，小程序的远程包不能带有代码
            //具体实现细节见引擎代码platforms/minigame/common/engine/AssetManager.js，与小程序相关的一些适配代码也在那个文件夹里面
            const bundleName = path.basename(url);
            const version = _remoteBundleVers[bundleName] || downloader["bundleVers"][bundleName];
            const suffix = version ? `${version}.` : '';
            //@ts-ignore
            if (_urlRegex.test(url) || url.startsWith(window.fsUtils.getUserDataPath())) {
                //@ts-ignore
                assetManager.cacheManager.makeBundleFolder(bundleName);
            } else {
                //@ts-ignore
                if (downloader.remoteBundles.indexOf(bundleName) !== -1) {
                    url = `${downloader.remoteServerAddress}remote/${bundleName}`;
                    //@ts-ignore
                    assetManager.cacheManager.makeBundleFolder(bundleName);
                } else {
                    url = `assets/${bundleName}`;
                }
                options.__cacheBundleRoot__ = bundleName;
                const config = `${url}/config.${suffix}json`;
                _downloadJson(config, options, function (err, data) {
                    if (err) {
                        onComplete && onComplete(err);
                        return;
                    }
                    if (data.isZip) {
                        const zipVersion = data.zipVersion;
                        const zipUrl = `${url}/res.${zipVersion ? zipVersion + '.' : ''}zip`;
                        _handleZip(zipUrl, options, function (err, unzipPath) {
                            if (err) {
                                onComplete && onComplete(err);
                                return;
                            }
                            data.base = unzipPath + '/res/';
                            // PATCH: for android alipay version before v10.1.95 (v10.1.95 included)
                            // to remove in the future
                            if (sys.platform === sys.Platform.ALIPAY_MINI_GAME && sys.os === sys.OS.ANDROID) {
                                let resPath = unzipPath + 'res/';
                                //@ts-ignore
                                if (window.fsUtils.fs.accessSync({path: resPath})) {
                                    data.base = resPath;
                                }
                            }
                            onComplete && onComplete(null, data);
                        });
                    } else {
                        data.base = url + '/';
                        onComplete && onComplete(null, data);
                    }
                });
            }
        }
    );
    assetManager.factory.register(
        "remoteBundle",
        (id: string, data: any, options: Record<string, any>, onComplete: ((err: Error|null, data?: any|null) => void)) => {
            //和engine中factory.ts的createBundle一致
            let bundle = assetManager.bundles.get(data.name);
            if (!bundle) {
                bundle = data.name === "resources" ? resources : new AssetManager.Bundle();
                data.base = data.base || `${id}/`;
                bundle.init(data);
            }
            onComplete(null, bundle);
        }
    );
}

function _setupDownloader() {
    assetManager.downloader.register({
        // Audio
        ".mp3": _downloadAsset,
        ".ogg": _downloadAsset,
        ".wav": _downloadAsset,
        ".m4a": _downloadAsset,

        // Image
        ".png": _downloadAsset,
        ".jpg": _downloadAsset,
        ".bmp": _downloadAsset,
        ".jpeg": _downloadAsset,
        ".gif": _downloadAsset,
        ".ico": _downloadAsset,
        ".tiff": _downloadAsset,
        ".image": _downloadAsset,
        ".webp": _downloadAsset,
        ".pvr": _downloadAsset,
        ".pkm": _downloadAsset,
        ".astc": _downloadAsset,

        ".font": _downloadAsset,
        ".eot": _downloadAsset,
        ".ttf": _downloadAsset,
        ".woff": _downloadAsset,
        ".svg": _downloadAsset,
        ".ttc": _downloadAsset,

        //txt
        ".txt": _downloadAsset,
        ".xml": _downloadAsset,
        ".vsh": _downloadAsset,
        ".fsh": _downloadAsset,
        ".atlas": _downloadAsset,

        ".tmx": _downloadAsset,
        ".tsx": _downloadAsset,
        ".plist": _downloadAsset,
        ".fnt": _downloadAsset,

        ".json": _downloadJson,
        ".ExportJson": _downloadAsset,

        ".binary": _downloadAsset,
        ".bin": _downloadAsset,
        ".dbbin": _downloadAsset,
        ".skel": _downloadAsset,
        ".mixskel": _downloadAsset,

        ".mp4": _downloadAsset,
        ".avi": _downloadAsset,
        ".mov": _downloadAsset,
        ".mpg": _downloadAsset,
        ".mpeg": _downloadAsset,
        ".rm": _downloadAsset,
        ".rmvb": _downloadAsset,
    });
}

function _setupParser() {
    assetManager.parser.register({
        ".mixskel": _parseArrayBuffer
    });
}

function _doNothing(content, options, onComplete) {
    //@ts-ignore
    window.fsUtils.exists(content, (existence) => {
        if (existence)
            onComplete(null, content);
        else
            onComplete(new Error(`file ${content} does not exist`));
    });
}

/**
 * 启动了md5Cache的情况下，缓存可以采用文件名作为键值
 * 这样在切换了资源目录的情况下，依然可以使用到不变的资源的缓存
 * 暂时只支持一些常见的类型
 */
function _downloadAsset(url, options, onComplete) {
    options.cacheWithFileName = _md5CacheEnable;
    _download(url, _doNothing, options, options.onFileProgress, onComplete);
}

function _transformUrl(url: string, options: Record<string, any>) {
    let inLocal = false;
    let inCache = false;
    //@ts-ignore
    let isInUserDataPath = url.startsWith(window.fsUtils.getUserDataPath());
    if (isInUserDataPath) {
        inLocal = true;
    } else if (_urlRegex.test(url)) {
        if (!options.reload) {
            const cacheKey = _convertFileCacheKey(url, options);
            //@ts-ignore
            let cache = assetManager.cacheManager.cachedFiles.get(cacheKey);
            if (cache) {
                inCache = true;
                url = cache.url;
            } else {
                //@ts-ignore
                let tempUrl = assetManager.cacheManager.tempFiles.get(cacheKey);
                if (tempUrl) {
                    inLocal = true;
                    url = tempUrl;
                }
            }
        }
    } else {
        inLocal = true;
    }
    return { url, inLocal, inCache };
}

function _download(url: string, func: Function, options: Record<string, any>, onFileProgress: Function, onComplete: Function) {
    const result = _transformUrl(url, options);
    //@ts-ignore
    const cacheManager = assetManager.cacheManager;
    if (result.inLocal) {
        func(result.url, options, onComplete);
    } else if (result.inCache) {
        //@ts-ignore
        cacheManager.updateLastTime(url);
        func(result.url, options, function (err, data) {
            if (err)
                cacheManager.removeCache(url);
            onComplete(err, data);
        });
    } else {
        //@ts-ignore
        window.fsUtils.downloadFile(url, null, options.header, onFileProgress, function (err, path) {
            if (err) {
                onComplete(err, null);
                return;
            }
            func(path, options, function (err, data) {
                if (!err) {
                    const cacheKey = _convertFileCacheKey(url, options);
                    //@ts-ignore
                    cacheManager.tempFiles.add(cacheKey, path);
                    //@ts-ignore
                    cacheManager.cacheFile(cacheKey, path, options.cacheEnabled, options.__cacheBundleRoot__, true);
                }
                onComplete(err, data);
            });
        });
    }
}

function _parseJson(url, options, onComplete) {
    //@ts-ignore
    window.fsUtils.readJson(url, onComplete);
}

function _parseArrayBuffer(url, options, onComplete) {
    //@ts-ignore
    window.fsUtils.readArrayBuffer(url, onComplete);
}

function _downloadJson(url, options, onComplete) {
    _download(url, _parseJson, options, options.onFileProgress, onComplete);
}

function _handleZip(url, options, onComplete) {
    const cacheManager = assetManager.cacheManager;
    const cachedUnzip = cacheManager.cachedFiles.get(url);
    if (cachedUnzip) {
        //@ts-ignore
        cacheManager.updateLastTime(url);
        onComplete && onComplete(null, cachedUnzip.url);
    } else if (_urlRegex.test(url))
        //@ts-ignore
        window.fsUtils.downloadFile(
            url, null, options.header, options.onFileProgress,
            function (err, downloadedZipPath) {
                if (err) {
                    onComplete && onComplete(err);
                    return;
                }
                //@ts-ignore
                cacheManager.unzipAndCacheBundle(
                    url, downloadedZipPath,
                    options.__cacheBundleRoot__,
                    onComplete
                );
            }
        )
    else
        //@ts-ignore
        cacheManager.unzipAndCacheBundle(
            url, url,
            options.__cacheBundleRoot__,
            onComplete
        );
}

function _convertFileCacheKey(url: string, options: Record<string, any>) {
    if (url.search('md5Name=false') >= 0) {
        return url;
    }
    return options.cacheWithFileName ?
        path.basename(url) :
        url;
}