// @ts-nocheck

import { assetManager, Node, UIOpacity, UIRenderer } from "cc";
import { JSB, NATIVE } from "cc/env";
import { aspects } from "../utils/Aspects";
import { supportVersions } from "./SupportVersions";

const kDontReleaseKey = '$nativeDontRelease';

 /*
 * 定制native平台的资源工作流
 * 原实现细节见引擎代码platforms/native/engine/jsb-loader.js
 */
function init() {
    aspects.checkEngineVersion(supportVersions._3_8_x, true);
    if (JSB && NATIVE) {
        _setupDownloader();
        _setupParser();
        _injectFix();
    }
}

function _setupDownloader() {
    const downloaders: Record<string, any> = assetManager.downloader._downloaders;
    downloaders['.mixskel'] = downloaders['.skel'];
}

function _setupParser() {
    const parsers: Record<string, any> = assetManager.parser._parsers;
    parsers['.mixskel'] = parsers['.skel'];
}

function _injectFix() {
    // 由于native平台的特殊性，需要在引擎目录中resources/resources/3d/engine/native/cocos/bindings/manual/jsb_spine_manual.cpp中添加对后缀.mixskel的支持
    // 添加好后，重新make工程

    {
        // 修复native平台下uuid和nativeUrl属性可能为空的问题
        const AssetProto = jsb.Asset.prototype;
        const uuidProp = Object.getOwnPropertyDescriptor(AssetProto, 'uuid');
        Object.defineProperty(
            AssetProto, 'uuid',
            {
                get() {
                    return this._uuid || uuidProp.get.call(this);
                }
            }
        );
        const nativeUrlProp = Object.getOwnPropertyDescriptor(AssetProto, 'nativeUrl');
        Object.defineProperty(
            AssetProto, 'nativeUrl',
            {
                get() {
                    return this._nativeUrl || nativeUrlProp.get.call(this);
                }
            }
        );
    }

    {
        // 修复UIOpacity中父节点透明度没有往下传递的问题
        const _1 = UIOpacity.prototype.setEntityLocalOpacityDirtyRecursively;
        UIOpacity.prototype.setEntityLocalOpacityDirtyRecursively = function (this: UIOpacity, dirty: boolean) {
            if (JSB) {
                const parent = this.node.parent;
                const parentOpacity = parent?._selfOpacity ?? 1;
                UIOpacity.setEntityLocalOpacityDirtyRecursively.call(UIOpacity, this.node, dirty, parentOpacity);
            }
        }

        const _2 = UIOpacity.setEntityLocalOpacityDirtyRecursively;
        UIOpacity.setEntityLocalOpacityDirtyRecursively = function (this: typeof UIOpacity, node: Node, dirty: boolean, interruptParentOpacity: number) {
            if (!node.isValid) {
                return;
            }

            const render = node._uiProps.uiComp as UIRenderer;
            const uiOp = node.getComponent(UIOpacity);
            let interruptOpacity = interruptParentOpacity;

            if (render && render.color) {
                render.renderEntity.colorDirty = dirty;
                if (uiOp)
                    render.renderEntity.localOpacity = interruptOpacity * uiOp.opacity / 255;
                else
                    render.renderEntity.localOpacity = interruptOpacity;
                interruptOpacity = render.renderEntity.localOpacity;
            } else if (uiOp) {
                interruptOpacity = interruptOpacity * uiOp.opacity / 255;
            } else {

            }

            node['_selfOpacity'] = interruptOpacity;

            for (let i = 0; i < node.children.length; i++)
                UIOpacity.setEntityLocalOpacityDirtyRecursively(node.children[i], dirty || (interruptOpacity < 1), interruptOpacity);
        }
    }
}

function dontRelease(asset: Asset) {
    asset[kDontReleaseKey] = true;

    const releaseManager = assetManager._releaseManager;
    const dontDestroyAssets = releaseManager._dontDestroyAssets as string[];
    //阻止自动释放资源
    if (!dontDestroyAssets.includes(asset.uuid))
        dontDestroyAssets.push(asset.uuid);
}

export const injectFixJSB = {
    init,
    dontRelease
}