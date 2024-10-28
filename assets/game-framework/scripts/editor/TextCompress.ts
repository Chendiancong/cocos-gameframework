import { _decorator, Asset, Component, Node, TextAsset } from 'cc';
import { aspects } from '../utils/Aspects';
import { editorUtil } from './EditorUtil';
const { ccclass, property } = _decorator;

@ccclass('TextCompress')
export class TextCompress extends Component {
    @property([TextAsset])
    sources: TextAsset[] = []
    @property({ displayName: '目标位置' })
    targetUrl: string = 'game-res/blockwords-pack.bin';
    @property({ displayName: '开始压缩' })
    get startCompress() { return false; }
    set startCompress(value: boolean) {
        if (value && aspects.checkEditor()) {
            const uuids = new Set<string>();
            const compressedData = TextCompress.deflate(
                ...this.sources.filter(v => {
                    if (uuids.has(v.uuid))
                        return false;
                    uuids.add(v.uuid)
                    return true;
                })
                .map(v => v.text)
                .filter(v => !!v)
            );
            let targetUrl = this.targetUrl;
            if (targetUrl.search(/^db:\/\/assets\//) < 0)
                targetUrl = `db://assets/${targetUrl.replace(/^[\/\\]+/, '')}`;
            editorUtil.createFile(targetUrl, compressedData);
        }
    }

    @property(Asset)
    binFile: Asset = null;
    @property({ displayName: '测试解压' })
    get startDecompress() { return false; }
    set startDecompress(value: boolean) {
        if (value && aspects.checkEditor()) {
            console.log(this.binFile);
            editorUtil.queryAssetInfo(this.binFile.uuid)
                .then(info => {
                    console.log(info);
                    const targetUrl = info.url.replace('pack', 'unpack').replace('bin', 'txt');
                    const decompressedData = TextCompress.inflate(this.binFile._nativeAsset);
                    console.log(targetUrl);
                    editorUtil.createFile(targetUrl, decompressedData);
                });
        }
    }

    static deflate(...strs: string[]) {
        const pako = window.pako;
        let totalStr = strs.reduce((prev, curVal) => {
            if (!!prev)
                prev += '\n';
            return prev + curVal;
        }, '');
        return pako.deflate(totalStr);
    }

    static inflate(data: string|Uint8Array|ArrayBuffer) {
        const pako = window.pako;
        return pako.inflate(data);
    }
}