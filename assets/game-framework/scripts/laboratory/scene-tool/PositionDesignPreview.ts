import { CCObject, Component, Mesh, Prefab, _decorator, assetManager, instantiate } from "cc";

const { ccclass, executeInEditMode } = _decorator;

@ccclass('PositionDesignPreview')
@executeInEditMode
export class PositionDesignPreview extends Component {
    private _uuid: string = '3537e8e6-717e-4e24-a715-437c0c6591b8';

    start() {
        assetManager.loadAny<Prefab>(
            this._uuid,
            (err, asset) => {
                if (err)
                    throw err;
                const node = instantiate(asset);
                node.parent = this.node;
            }
        )
    }
}