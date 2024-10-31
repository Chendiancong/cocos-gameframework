import { Component, Enum, IGeometryInfo, Mesh, MeshRenderer, Node, Prefab, _decorator, instantiate, misc, murmurhash2_32_gc, primitives, utils } from "cc";
import { EDITOR } from "cc/env";
import { editorUtil } from "game-framework/scripts/editor/EditorUtil";

const { ccclass, property } = _decorator;

enum ExportType {
    Json,
    Binary
}
Enum(ExportType);

const kUint32ByteCount = 4;
const kFloatByteCount = 4;

@ccclass("MergedMeshExporter")
export class MergedMeshExporter extends Component {
    @property(Node)
    root: Node = null;
    @property({ tooltip: 'assets相对路径' })
    exportPath: string = 'exportedMeshes/mergedMesh';
    @property({ type: ExportType })
    exportType = ExportType.Json;
    @property
    get export() { return false; }
    set export(value: boolean) {
        if (value && EDITOR) {
            this._exportMesh();
        }
    }

    private static readonly _meshCacheByHash: Record<number, Mesh> = {};
    static convertFromContent(exportedContent: string) {
        const hash = murmurhash2_32_gc(exportedContent, 666);
        if (this._meshCacheByHash[hash])
            return this._meshCacheByHash[hash];
        const geometry = JSON.parse(exportedContent);
        const mesh = utils.MeshUtils.createMesh(geometry);
        this._meshCacheByHash[hash] = mesh;
        return mesh;
    }

    private static readonly _meshCacheByPrefab: Record<string, Mesh> = {};
    static convertFromPrefab(prefab: Prefab) {
        if (!prefab?.isValid)
            return null;
        const uuid = prefab.uuid;
        if (this._meshCacheByPrefab[uuid])
            return this._meshCacheByPrefab[uuid];
        const template = instantiate(prefab);
        const mesh = MergedMeshExporter.mergeMesh(template);
        this._meshCacheByPrefab[uuid] = mesh;
        template.destroy();
        return mesh;
    }

    static createBufferFromGeometry(geometry: Readonly<primitives.IGeometry>) {
        let size = 0;

        const positions = geometry.positions;
        const normals = geometry.normals ?? [];
        const uvs = geometry.uvs ?? [];
        const colors = geometry.colors ?? [];
        const indices = geometry.indices ?? [];

        // position length
        size += kUint32ByteCount;
        // position data
        size += positions.length * kFloatByteCount;

        // normal length
        size += kUint32ByteCount;
        // normal data
        size += normals.length * kFloatByteCount;

        // uv length
        size += kUint32ByteCount;
        // uv data
        size += uvs.length * kFloatByteCount;

        // color length
        size += kUint32ByteCount;
        // color data
        size += colors.length * kFloatByteCount;

        // index length
        size += kUint32ByteCount;
        // index data
        size += indices.length * kUint32ByteCount;

        console.log(`total size is ${size}`);
        console.log(`position length is ${positions.length}`);
        console.log(`normal length is ${normals.length}`);
        console.log(`uv length is ${uvs.length}`);
        console.log(`color length is ${colors.length}`);
        console.log(`index length is ${indices.length}`);

        const arrayBuffer = new ArrayBuffer(size);
        const dataView = new DataView(arrayBuffer);
        let offset = 0;

        dataView.setUint32(offset, positions.length);
        offset += kUint32ByteCount;
        for (let i = 0, len = positions.length; i < len; ++i) {
            dataView.setFloat32(offset, positions[i]);
            offset += kFloatByteCount;
        }

        dataView.setUint32(offset, normals.length);
        offset += kUint32ByteCount;
        for (let i = 0, len = normals.length; i < len; ++i) {
            dataView.setFloat32(offset, normals[i]);
            offset += kFloatByteCount;
        }

        dataView.setUint32(offset, uvs.length);
        offset += kUint32ByteCount;
        for (let i = 0, len = uvs.length; i < len; ++i) {
            dataView.setFloat32(offset, uvs[i]);
            offset += kFloatByteCount;
        }

        dataView.setUint32(offset, colors.length);
        offset += kUint32ByteCount;
        for (let i = 0, len = colors.length; i < len; ++i) {
            dataView.setFloat32(offset, colors[i]);
            offset += kFloatByteCount;
        }

        dataView.setUint32(offset, indices.length);
        offset += kUint32ByteCount;
        for (let i = 0, len = indices.length; i < len; ++i) {
            dataView.setUint32(offset, indices[i]);
            offset += kUint32ByteCount;
        }

        const pako = window.pako;
        const compressedData = pako.deflate(arrayBuffer)
        // @ts-ignore
        return Buffer.from(compressedData);
    }

    static readGeometryFromBuffer(buffer: ArrayBuffer) {
        const pako = window.pako;
        const decompressedData = pako.inflate(buffer);
        const originBuffer = decompressedData.buffer;
        const dataView = new DataView(originBuffer);

        const positions: number[] = [],
            normals: number[] = [],
            uvs: number[] = [],
            colors: number[] = [],
            indices: number[] = [];
        let offset = 0;

        const positionLen = dataView.getUint32(offset);
        offset += kUint32ByteCount;
        for (let i = 0; i < positionLen; ++i) {
            positions.push(dataView.getFloat32(offset));
            offset += kFloatByteCount;
        }

        const normalLen = dataView.getUint32(offset);
        offset += kUint32ByteCount;
        for (let i = 0; i < normalLen; ++i) {
            normals.push(dataView.getFloat32(offset));
            offset += kFloatByteCount;
        }

        const uvLen = dataView.getUint32(offset);
        offset += kUint32ByteCount;
        for (let i = 0; i < uvLen; ++i) {
            uvs.push(dataView.getFloat32(offset));
            offset += kFloatByteCount;
        }

        const colorLen = dataView.getUint32(offset);
        offset += kUint32ByteCount;
        for (let i = 0; i < colorLen; ++i) {
            colors.push(dataView.getFloat32(offset));
            offset += kFloatByteCount;
        }

        const indiceLen = dataView.getUint32(offset);
        offset += kUint32ByteCount;
        for (let i = 0; i < indiceLen; ++i) {
            indices.push(dataView.getUint32(offset));
            offset += kUint32ByteCount;
        }

        return <primitives.IGeometry>{
            positions,
            normals,
            uvs,
            colors,
            indices
        };
    }

    static mergeMesh(root: Node, outMesh?: Mesh): Mesh {
        outMesh = outMesh ?? new Mesh();
        for (const renderer of root.getComponentsInChildren(MeshRenderer))
            outMesh.merge(renderer.mesh, renderer.node.worldMatrix);
        return outMesh;
    }

    private _exporting = false;
    private async _exportMesh() {
        if (this._exporting)
            return;
        this._exporting = true;
        let mesh: Mesh;
        try {
            mesh = new Mesh();
            const root = this.root?.isValid ? this.root : this.node;
            MergedMeshExporter.mergeMesh(root, mesh);
            const geometry = utils.readMesh(mesh);
            const content = JSON.stringify(geometry);
            
            let exportPath = this.exportPath;
            exportPath = 'db://assets/' + exportPath;
            switch (this.exportType) {
                case ExportType.Json:
                    {
                        if (exportPath.search(/\.txt$/i) < 0)
                            exportPath = exportPath + '.txt';
                        await editorUtil.createOrSaveAsset(exportPath, content);
                    }
                    break;
                case ExportType.Binary:
                    {
                        if (exportPath.search(/\.bin$/i) < 0)
                            exportPath = exportPath + '.bin';
                        
                        await editorUtil.createFile(
                            exportPath,
                            MergedMeshExporter.createBufferFromGeometry(geometry)
                        );
                    }
                    break;
            }
        } catch (e) {
            throw e;
        } finally {
            this._exporting = false;
            mesh.destroy();
        }
    }
}