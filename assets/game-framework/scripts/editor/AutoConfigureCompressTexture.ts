import { _decorator, Component, CCString, Enum } from 'cc';
import { aspects } from '../utils/Aspects';
import { AssetInfo, AssetMeta, editorUtil, TextureCompressSettings } from './EditorUtil';
const { ccclass, property } = _decorator;

enum ConfigureMode {
    Setup,
    Change
}

Enum(ConfigureMode);

function fieldIs(fieldName: string, target: any) {
    return function () {
        return this[fieldName] === target;
    }
}

const originTooltip = '当前的压缩纹理方案与之相同时才将此变换为用户指定的方案';
const configureModeTip = `Setup: 无论当前方案是什么，都将其设置为指定的方案;
Change: 当前方案与起始方案（空值也有意义）相同时，才将其设置为指定方案;
`;

@ccclass('AutoConfigureCompressTexture')
export class AutoConfigureCompressTexture extends Component {
    @property({ type: [CCString], displayName: "需要处理的目录", tooltip: "db://..." })
    dirs: string[] = [];
    @property({
        type: ConfigureMode, displayName: 'png方案设置模式',
        tooltip: configureModeTip
    })
    pngMode: ConfigureMode = ConfigureMode.Change;
    @property({ displayName: "png方案uuid" })
    pngHandle: string = "";
    @property({
        displayName: '起始png方案uuid', tooltip: originTooltip,
        visible: fieldIs('pngMode', ConfigureMode.Change)
    })
    originPngHandle: string = '';
    @property({
        type: ConfigureMode, displayName: 'jpg方案设置模式',
        tooltip: configureModeTip
    })
    jpgMode: ConfigureMode = ConfigureMode.Change;
    @property({ displayName: "jpg方案uuid" })
    jpgHandle: string = "";
    @property({
        displayName: '起始jpg方案uuid', tooltip: originTooltip,
        visible: fieldIs('jpgMode', ConfigureMode.Change),
    })
    originJpgHandle: string = '';

    declare private _handleDic: Record<string, boolean>;

    @property({ displayName: "开始配置" })
    get doit() { return false; }
    set doit(value: boolean) {
        if (value)
            this._doAutoConfigure();
    }

    @aspects.editor
    private async _doAutoConfigure() {
        this._handleDic = Object.create(null);
        this._handleDic[this.pngHandle] = true;
        this._handleDic[this.jpgHandle] = true;
        for (const url of this.dirs) {
            console.log(`handle ${url}...`);
            let _url = url;
            if (_url.endsWith('/'))
                _url = _url.substring(0, _url.lastIndexOf('/'));
            const info = await editorUtil.queryAssetInfo(_url);
            if (!info) {
                console.warn(`invalid url ${url}!`);
                continue;
            }
            await this._walk(info);
        }
        console.log('done!');
    }

    /**
     * 递归遍历资源
     */
    private async _walk(assetInfo: AssetInfo) {
        if (assetInfo.isDirectory) {
            const assetsUnderUrl = await editorUtil.queryAssets(`${assetInfo.url}/*`);

            let autoAtlas: AssetInfo;
            for (const asset of assetsUnderUrl) {
                if (asset.importer == 'auto-atlas') {
                    autoAtlas = asset;
                    break;
                }
            }

            if (!!autoAtlas) {
                //如果存在自动图集，那么支队自动图集配置就好了，自动图集为png
                const meta = await editorUtil.queryAssetMeta(autoAtlas.uuid);
                if (this._configureAssetMeta(assetInfo, meta, "png"))
                    await editorUtil.saveAssetMeta(autoAtlas.uuid, JSON.stringify(meta, null, 2));
            } else {
                for (const asset of assetsUnderUrl)
                    await this._walk(asset);
            }
        } else {
            let type: 'png'|'jpg'|null;
            if (assetInfo.library['.png'])
                type = 'png';
            else if (assetInfo.library['.jpg'])
                type = 'jpg';
            if (!type)
                return;

            const meta = await editorUtil.queryAssetMeta(assetInfo.uuid);
            if (this._configureAssetMeta(assetInfo, meta, type))
                await editorUtil.saveAssetMeta(assetInfo.uuid, JSON.stringify(meta, null, 2));
        }
    }

    private _configureAssetMeta(info: AssetInfo, meta: AssetMeta, type: 'png'|'jpg') {
        const presetId = type == 'png' ? this.pngHandle : this.jpgHandle;
        const originPresetId = type == 'png' ? this.originPngHandle : this.originJpgHandle;
        const mode = type == 'png' ? this.pngMode : this.jpgMode;
        let changed = false;
        if (presetId) {
            // 将要配置为压缩纹理
            if (meta.userData == void 0)
                meta.userData = Object.create(null);
            let compressSettings = meta.userData.compressSettings as TextureCompressSettings;

            // changed = this._checkCompressSettingsChange(compressSettings, presetId);
            changed = this._checkCompressSettingsChange2(
                compressSettings,
                mode,
                presetId,
                originPresetId
            );
            if (changed) {
                if (compressSettings == void 0)
                    compressSettings = meta.userData.compressSettings = Object.create(null);
                compressSettings.useCompressTexture = true;
                compressSettings.presetId = presetId;
            }
        } else {
            // 将要取消压缩纹理配置
            let compressSettings = meta.userData?.compressSettings as TextureCompressSettings;
            // changed = this._checkCompressSettingsChange(compressSettings, presetId);
            changed = this._checkCompressSettingsChange2(
                compressSettings,
                mode,
                presetId,
                originPresetId
            );
            if (changed) {
                compressSettings.useCompressTexture = false;
                compressSettings.presetId = '';
            }
        }

        if (changed)
            console.log(`${type}-rewrite:${info.url},${presetId}`);
        else
            console.log(`${type}-notchange:${info.url}`);

        return changed;
    }

    private _checkCompressSettingsChange2(settings: TextureCompressSettings, mode: ConfigureMode, presetId: string, originPresetId: string) {
        if (mode == ConfigureMode.Setup) {
            if (presetId)
                return settings == void 0 ||
                    !settings.useCompressTexture ||
                    settings.presetId != presetId;
            else
                return !!settings &&
                    !!settings.useCompressTexture &&
                    !!settings.presetId;
        } else if (mode == ConfigureMode.Change) {
            if (settings?.useCompressTexture)
                return originPresetId == settings.presetId;
            else
                return !originPresetId;
        } else
            return true;
    }

    private _checkCompressSettingsChange(settings: TextureCompressSettings, presetId: string) {
        if (presetId)
            return settings == void 0 ||
                !settings.useCompressTexture ||
                !settings.presetId;
        else
            return settings != void 0 &&
                !!settings.useCompressTexture &&
                this._handleDic[settings.presetId];
    }
}