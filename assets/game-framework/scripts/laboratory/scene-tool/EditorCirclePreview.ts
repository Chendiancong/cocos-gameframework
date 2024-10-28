import { CCObject, Color, Component, MeshRenderer, Node, Prefab, _decorator, assetManager, instantiate } from "cc";

const { ccclass, executeInEditMode } = _decorator;

@ccclass('EditorCirclePreview')
@executeInEditMode
export class EditorCirclePreview extends Component {
    private _uuid: string = '3537e8e6-717e-4e24-a715-437c0c6591b8';
    private _innerNode: Node;
    private _dummyColor: Color;

    start() {
        assetManager.loadAny<Prefab>(
            this._uuid,
            (err, asset) => {
                if (err)
                    throw err;
                const node = instantiate(asset);
                node.parent = this.node;
                node._objFlags |= CCObject.Flags.DontSave|CCObject.Flags.HideInHierarchy;
                this._innerNode = node;

                const color = this._dummyColor;
                delete this._dummyColor;
                if (color != void 0)
                    this._internalSetColor(color);
            }
        )
    }

    setColor(color: Color) {
        if (!this._innerNode?.isValid)
            this._dummyColor = new Color(color);
        else
            this._internalSetColor(color);
    }

    private _internalSetColor(color: Color) {
        
        const renderer = this._innerNode.getComponent(MeshRenderer);
        const material = renderer.getMaterialInstance(0);
        const handle = material.passes[0].getHandle('mainColor');
        if (handle > 0)
            material.passes[0].setUniform(handle, color);
    }
}