import { Asset, CCObject, Component, Enum, JsonAsset, Material, Mesh, MeshRenderData, MeshRenderer, Node, Prefab, TextAsset, _decorator, instantiate, utils } from "cc";
import { MergedMeshExporter } from "./MergedMeshExporter";
import { EDITOR } from "cc/env";

const { ccclass, property, executeInEditMode } = _decorator;

export enum TemplateType {
    Content,
    MeshFile,
    Prefab,
}
Enum(TemplateType);

@ccclass("CreateMergedModel")
@executeInEditMode
export class CreateMergedModel extends Component {
    @property({ type: TemplateType })
    fileType: TemplateType = TemplateType.Content;
    @property({ type: Asset, visible: function () { return this.fileType === TemplateType.MeshFile; } })
    binaryFile: Asset = null;
    @property({ type: TextAsset, visible: function () { return this.fileType === TemplateType.Content; } })
    content: TextAsset = null;
    @property({ type: Prefab, visible: function () { return this.fileType === TemplateType.Prefab; } })
    prefab: Prefab = null;
    @property(Material)
    material: Material = null;
    @property
    get editorCreateModel() { return false; }
    set editorCreateModel(value: boolean) {
        if (value && EDITOR)
            this._createModel();
    }

    private _model: MeshRenderer;
    private _prefabUuid: string;
    private _prefabMesh: Mesh;

    protected start() {
        this._createModel();
    }

    private _createModel() {
        const mesh = this._getMesh();
        if (this._model?.mesh?.hash === mesh?.hash && !EDITOR)
            return;

        if (!this._model?.isValid) {
            const node = new Node(`$Model`);
            node._objFlags = CCObject.Flags.DontSave|CCObject.Flags.HideInHierarchy;
            node.layer = this.node.layer;
            node.parent = this.node;
            this._model = node.addComponent(MeshRenderer);
        }

        this._model.mesh = mesh;
        this._model.setSharedMaterial(this.material, 0);
    }

    private _getMesh() {
        switch (this.fileType) {
            case TemplateType.Content:
                if (this.content?.isValid)
                    return MergedMeshExporter.convertFromContent(this.content.text);
                else
                    return null;
            case TemplateType.MeshFile:
                {
                    let geometry = MergedMeshExporter.readGeometryFromBuffer(this.binaryFile._nativeAsset);
                    return utils.MeshUtils.createMesh(geometry);
                }
            case TemplateType.Prefab:
                {
                    if (this._prefabMesh?.isValid && this.prefab.uuid === this._prefabUuid)
                        return this._prefabMesh;
                    this._prefabUuid = this.prefab?.uuid ?? '';
                    if (this.prefab?.isValid) {
                        let template = instantiate(this.prefab);
                        this._prefabMesh = MergedMeshExporter.mergeMesh(template);
                        template.destroy();
                    }
                    return this._prefabMesh;
                }
        }
    }
}