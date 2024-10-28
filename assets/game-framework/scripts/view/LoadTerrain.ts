import { CCObject, Component, Node, Terrain, TerrainAsset, _decorator } from "cc";
import { ResReference } from "../res/ResReference";
import { aspects } from "../utils/Aspects";
import { ResKeeper } from "../res/ResKeeper";
import { getOrAddComponent } from "../utils/util";

const { ccclass, property, executeInEditMode, disallowMultiple } = _decorator;

@ccclass('LoadTerrain.TerrainRes')
class TerrainRes extends ResReference {
    @property({ type: TerrainAsset, override: true })
    get asset() { return this._asset as TerrainAsset; }
    set asset(value: TerrainAsset) { this._internalSetAsset(value); }
}

@ccclass('LoadTerrain')
@executeInEditMode
@disallowMultiple
export class LoadTerrain extends Component {
    @property(TerrainRes)
    terrainRes = new TerrainRes();
    @property
    get rebuild() { return false; }
    set rebuild(value: boolean) {
        if (value && aspects.checkEditor())
            this._buildTerrain();
    }

    private _terrain: Terrain;

    protected start() {
        const terrainNode = this.node.getChildByName('$TerrainNode');
        if (terrainNode?.isValid)
            this._terrain = getOrAddComponent(terrainNode, Terrain);
        this._buildTerrain();
    }

    private async _buildTerrain() {
        if (!this.terrainRes.assetUuid)
            return;
        const asset = await this.terrainRes.aloadAsset<TerrainAsset>();
        if (!this.isValid) {
            asset.decRef();
            return;
        }
        if (!this._terrain?.isValid) {
            const node = new Node('$TerrainNode');
            node.parent = this.node;
            this._terrain = node.addComponent(Terrain);
        }
        ResKeeper.register(this._terrain.node, asset, this._terrain.getComponent(ResKeeper));
        this._terrain._asset = asset;
    }
}