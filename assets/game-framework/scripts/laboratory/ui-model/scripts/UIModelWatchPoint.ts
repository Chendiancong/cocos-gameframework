import { CCObject, Camera, Color, Component, Layers, Node, Vec3, _decorator, renderer } from "cc";
import { EDITOR } from "cc/env";
import { aspects } from "game-framework/scripts/utils/Aspects";
import { gMath } from "game-framework/scripts/utils/math/MathUtil";

const { ccclass, executeInEditMode, property } = _decorator;

@ccclass('UIModelWatchPoint')
@executeInEditMode
export class UIModelWatchPoint extends Component {
    @property({ readonly: true })
    clearFlags = Camera.ClearFlag.SOLID_COLOR;
    @property({ readonly: true })
    clearColor = new Color(51, 51, 51, 0);
    @property({ readonly: true })
    projection = renderer.scene.CameraProjection.ORTHO;
    @property({ readonly: true })
    orthoHeight = 10;
    @property({ readonly: true })
    fovAxis = Camera.FOVAxis.VERTICAL;
    @property({ readonly: true })
    fov = 45;
    @property({ readonly: true })
    near = 1;
    @property({ readonly: true })
    far = 50;
    @property({ readonly: true })
    watchPos = new Vec3(0, 0, -10);
    @property({ readonly: true })
    watchDir = new Vec3(Vec3.FORWARD).multiplyScalar(-1);
    @property({ tooltip: EDITOR ? '保存ui摄像机状态' : '' })
    get save() { return false; }
    set save(value: boolean) {
        if (value && aspects.checkEditor()) {
            const camera = this._watchCamera;
            this.fromCamera(camera);
        }
    }

    private _watchNode: Node;
    private _watchCamera: Camera;

    setupCamera(cam: Camera) {
        cam.clearFlags = this.clearFlags;
        cam.clearColor = this.clearColor;
        cam.projection = this.projection;
        cam.orthoHeight = this.orthoHeight;
        cam.fovAxis = this.fovAxis;
        cam.fov = this.fov;
        cam.near = this.near;
        cam.far = this.far;
        cam.node.setPosition(this.watchPos);
        cam.node.forward = this.watchDir;
    }

    fromCamera(cam: Camera) {
        this.clearFlags = cam.clearFlags;
        this.clearColor = cam.clearColor;
        this.projection = cam.projection;
        this.orthoHeight = cam.orthoHeight;
        this.fovAxis = cam.fovAxis;
        this.fov = cam.fov;
        this.near = cam.near;
        this.far = cam.far;
        this.watchPos.set(cam.node.position);
        this.watchDir.set(cam.node.forward);
    }

    protected start() {
        if (aspects.checkEditor())
            this._createWatchCamera();
    }

    private _createWatchCamera() {
        this._watchNode = new Node('$WatchCameraNode');
        this._watchNode.parent = this.node;
        this._watchNode._objFlags |= CCObject.Flags.DontSave;
        const camera = this._watchCamera = this._watchNode.addComponent(Camera);
        this.setupCamera(camera);

        camera.visibility = Layers.BitMask['GAME_FIGHT_3D'];
    }
}