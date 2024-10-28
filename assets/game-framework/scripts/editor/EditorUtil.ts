import { EDITOR } from "cc/env"
import { aspects } from "../utils/Aspects"

const { checkEditor } = aspects;

export type AssetInfo = {
    displayName: string,
    file: string,
    imported: boolean,
    importer: string,
    invalid: boolean,
    isDirectory: boolean,
    library: Record<string|number, any>,
    name: string,
    path: string,
    readonly: boolean,
    source: string,
    subAssets: Record<string|number, any>,
    type: string,
    url: string,
    uuid: string,
    visible: boolean
}

export type TextureCompressSettings = {
    useCompressTexture: boolean,
    presetId: string
}

export type AssetMeta = {
    displayName: string,
    files: string[],
    id: string,
    imported: boolean,
    importer: string,
    name: string,
    subMetas: Record<string|number, any>;
    userData: {
        compressSettings?: TextureCompressSettings
    }|Record<string|number, any>,
    uuid: string,
    ver: string
}

export type AssetOperationOption = {
    /** If overwrite is enforced, the default is false */
    overwrite?: boolean,
    /** Default false if the conflict is automatically renamed */
    rename?: boolean
}

export const editorUtil = {
    queryAssetInfo,
    deleteAsset,
    createAsset,
    saveAsset,
    createFile,
    createOrSaveAsset,
    createPrefab,
    duplicateNode,
    queryAssets,
    queryAssetMeta,
    saveAssetMeta,
    copyAsset
}

/**
 * 获取资源信息
 * @param urlOrUuid uuid or db://assets/....
 * @returns 
 */
function queryAssetInfo(urlOrUuid: string): Promise<AssetInfo> {
    checkEditor(true);
    return Editor.Message.request("asset-db", "query-asset-info", urlOrUuid);
}

/**
 * 删除资源
 * @param url db://assets/....
 */
function deleteAsset(url: string): Promise<void> {
    checkEditor(true)
    return Editor.Message.request("asset-db", "delete-asset", url);
}

/**
 * 创建资源
 * @param url db://assets/....
 * @param content content {string | null} Writes the contents of a string to a file, or creates a new folder if null
 * @param option option.overwrite {boolean} If overwrite is enforced, the default is false, option.rename {boolean} Default false if the conflict is automatically renamed
 * @returns 
 */
function createAsset(url: string, content: string|null, option?: { overwrite?: boolean, rename?: boolean }): Promise<void> {
    checkEditor(true);
    return Editor.Message.request("asset-db", "create-asset", url, content, option);
}

/**
 * 保存资源
 * @param urlOrUuid uuid or db://assets/....
 * @param content content {string | Buffer} The content string of the resource. For typeArray, use the "buffer.from" transform.
 */
function saveAsset(urlOrUuid: string, content: string|Buffer): Promise<void> {
    checkEditor(true);
    return Editor.Message.request("asset-db", "save-asset", urlOrUuid, content);
}

/**
 * 在编辑模式下创建或者更新资源
 * @param url db://assets/...
 */
async function createOrSaveAsset(url: string, content: string): Promise<void> {
    checkEditor(true);
    const assetInfo = await queryAssetInfo(url);
    if (assetInfo != void 0)
        await saveAsset(url, content);
    else
        await createAsset(url, content)
}

/**
 * 保存为文件
 * @param url db://assets/...
 * @param content 
 */
async function createFile(url: string, content: string|DataView|Uint8Array) {
    checkEditor(true);
    // 编辑器模式下，使用node环境
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(Editor.Project.path, url.replace(/^db:\/\//, ''));
    if (!fs.existsSync(path.dirname(filePath)))
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
    console.log(`save file to ${filePath}, url is ${url}`);
    fs.writeFileSync(filePath, content);
    await Editor.Message.request('asset-db', 'refresh-asset', url);
}

/**
 * 在编辑模式下创建基于一个节点的预制件
 * @param nodeUuid 节点的uuid
 * @param path 预制体的储存路径，它是基于assets目录的一个相对路径
 */
function createPrefab(nodeUuid: string, path: string): Promise<void> {
    checkEditor(true);
    return Editor.Message.request("scene", "create-prefab", nodeUuid, path);
}

/**
 * 在编辑模式下复制一个节点
 * @param nodeUuid
 * @return Promise<[newUuid]>
 */
function duplicateNode(nodeUuid: string): Promise<string[]> {
    checkEditor(true);
    return Editor.Message.request("scene", "duplicate-node", nodeUuid);
}

/**
 * 获取一系列资源信息
 * @param pattern path matching pattern (like db://assets/*)
 */
function queryAssets(pattern: string): Promise<AssetInfo[]> {
    checkEditor(true);
    return Editor.Message.request('asset-db', 'query-assets', { pattern });
}

/**
 * 查询资源的meta文件信息
 * @param urlOrUuid uuid or db://assets..
 */
function queryAssetMeta(urlOrUuid: string): Promise<AssetMeta> {
    checkEditor(true);
    return Editor.Message.request('asset-db', 'query-asset-meta', urlOrUuid);
}

/**
 * 保存资源的meta文件
 * @param urlOrUuid the url or uuid of the asset
 */
function saveAssetMeta(urlOrUuid: string, content: string): Promise<AssetInfo> {
    checkEditor(true);
    return Editor.Message.request('asset-db', 'save-asset-meta', urlOrUuid, content);
}

/**
 * 复制资源
 * @param source source {string} The URL path of the source resource, for example: db://assets/abc.json
 * @param target target {string} The URL of the destination location copied to
 */
function copyAsset(source: string, target: string, option?: AssetOperationOption): Promise<AssetInfo> {
    checkEditor(true);
    return Editor.Message.request('asset-db', 'copy-asset', source, target, option);
}