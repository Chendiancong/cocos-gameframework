import { _decorator, Camera, CCObject, Color, Component, director, instantiate, Layers, Node, Prefab, renderer, RenderTexture, Size, Sprite, SpriteFrame, UITransform, Vec3, view } from 'cc';
import { EDITOR } from 'cc/env';
import { ResKeeper } from 'game-framework/scripts/res/ResKeeper';
import { UIModelWatchPoint } from './UIModelWatchPoint';
import { asDelegate, IDelegate } from 'game-framework/scripts/base/Delegate';
const { ccclass, property, executeInEditMode, requireComponent } = _decorator;

@ccclass('UIModelRenderer')
@requireComponent([UITransform])
@executeInEditMode
export class UIModelRenderer extends Component {
    static readonly Events = {
        UI_MODEL_SHOWUP: 'ui-model-showup'
    }

    @property(Prefab)
    editorPresetModel: Prefab;

    private static _id = -1;
    private static _freeIds: number[] = [];
    private _myId = UIModelRenderer._getId();
    private _modelUrl: string;
    private _model: Node;
    private _rt: RenderTexture;
    private _camera: Camera;
    private _targetSprite: Sprite;
    private _gray: boolean = false;

    @asDelegate
    modelChanged: IDelegate<(model: Node) => void>;
    @asDelegate
    modelNoChanged: IDelegate<(model: Node) => void>;
    get camera() { return this._camera; }
    get targetSprite() {
        if (!this._targetSprite?.isValid) {
            const contentNode = new Node('$Content');
            contentNode._objFlags |= CCObject.Flags.DontSave;
            contentNode.parent = this.node;
            this._targetSprite = contentNode.addComponent(Sprite);
            contentNode.layer = Layers.BitMask['UI_2D'];
        }
        return this._targetSprite;
    }

    private static _getId() {
        if (this._freeIds.length)
            return this._freeIds.pop();
        else
            return ++this._id;
    }

    private static _returnId(id: number) {
        this._freeIds.push(id);
    }

    async setModel(url: string) {
        if (this._modelUrl === url) {
            this.modelNoChanged.entry(this._model);
            return;
        }
        this._modelUrl = url;
        const prefab = await gFramework.resMgr.aloadRes<Prefab>(url);
        if (this._modelUrl !== url) {
            prefab.decRef();
            return;
        }
        this._onPrefabLoaded(prefab);
    }

    setGray(flag: boolean) {
        if (this._gray === flag)
            return;
        this._gray = flag;
        if (this._targetSprite?.isValid)
            this._targetSprite.grayscale = flag;
    }

    onLoad() {
        if (EDITOR || this.editorPresetModel?.isValid)
            this._onPrefabLoaded(this.editorPresetModel);
    }

    onEnable() {
        if (this._model?.isValid)
            this._model.active = true;
        if (this._camera?.isValid)
            this._camera.enabled = true;
    }

    onDisable() {
        if (this._model?.isValid)
            this._model.active = false;
        if (this._camera?.isValid)
            this._camera.enabled = false;
    }

    onDestroy() {
        UIModelRenderer._returnId(this._myId);
        if (this._model?.isValid)
            this._model.destroy();
        delete this._camera;
        if (this._rt?.isValid)
            this._rt.destroy();
    }

    private _onPrefabLoaded(prefab: Prefab) {
        let root = director.getScene().getChildByName('$UIModels');
        if (!root?.isValid) {
            root = new Node('$UIModels');
            root.parent = director.getScene();
            root._objFlags |= CCObject.Flags.DontSave;
        }
        if (this._model?.isValid)
            this._model.destroy();
        delete this._camera;
        const model = this._model = instantiate(prefab);
        this._model._objFlags |= CCObject.Flags.DontSave;
        model.parent = root;
        ResKeeper.register(model, prefab);
        this._onModelUpdate();
    }

    private _onModelUpdate() {
        this._updateRenderTexture();
        this._model.setPosition(
            100 * this._myId,
            -1000,
            -1000
        );
        this._updateCamera(this._model);

        this._model.emit(UIModelRenderer.Events.UI_MODEL_SHOWUP);
        this.modelChanged.entry(this._model);
    }

    private _updateRenderTexture() {
        const sprite = this.targetSprite;
        const nodeTransform = this.node.getComponent(UITransform);
        const spriteTransform = sprite.getComponent(UITransform);
        const designRes = view.getDesignResolutionSize();
        const nodeAspectRatio = nodeTransform.width / nodeTransform.height;
        const designAspectRatio = designRes.width / designRes.height;
        let finalWidth: number, finalHeight: number;
        // 根据设计分辨率的宽高比确定最终宽高
        if (nodeAspectRatio < designAspectRatio) {
            finalWidth = nodeTransform.width;
            finalHeight = nodeTransform.width / designAspectRatio;
        } else {
            finalWidth = nodeTransform.height * designAspectRatio;
            finalHeight = nodeTransform.height;
        }
        spriteTransform.setContentSize(new Size(finalWidth, finalHeight));
        const nodeAnchor = nodeTransform.anchorPoint;
        sprite.node.setPosition(
            (0.5 - nodeAnchor.x) * nodeTransform.width,
            (0 - nodeAnchor.y) * nodeTransform.height + 0.5 * spriteTransform.height,
            0
        );
        // bottomCenter
        // sprite.node.setPosition(
        //     (0.5 - nodeAnchor.x) * nodeTransform.width,
        //     (0 - nodeAnchor.y) * nodeTransform.height,
        //     0
        // );

        if (!this._rt)
            this._rt = new RenderTexture();
        if (this._rt.width !== finalWidth || this._rt.height !== finalHeight) {
            this._rt.reset({ width: finalWidth, height: finalHeight });
        }
        const spriteFrame = new SpriteFrame();
        spriteFrame.rect.set(0, 0, finalWidth, finalHeight);
        sprite.spriteFrame = spriteFrame;
        spriteFrame.texture = this._rt;
        // spriteFrame.flipUVY = true;
        let shaderDefines: Record<string, true> = {}
        if (sprite.stencilStage === 2 || sprite.stencilStage === 6) {
            shaderDefines['USE_ALPHA_TEST'] = true;
        }
        shaderDefines['SAMPLE_FROM_RT'] = true
        sprite.getMaterialInstance(0).recompileShaders(shaderDefines);
        sprite.grayscale = this._gray;
    }

    private _updateCamera(model: Node) {
        let cam = this._camera;
        if (!cam?.isValid) {
            const cameraNode = new Node(`$UIModelCamera_${this._myId}`);
            cam = this._camera = cameraNode.addComponent(Camera);
            cam.priority = 2000;
            cam.visibility = model?.layer ?? Layers.BitMask['GAME_FIGHT_3D'];
        }

        const watchPoint = model.getComponent(UIModelWatchPoint);
        if (watchPoint?.isValid && watchPoint.enabled) {
            watchPoint.setupCamera(cam);
        } else {
            cam.clearFlags = Camera.ClearFlag.SOLID_COLOR;
            cam.clearColor = new Color(51, 51, 51, 0);
            cam.projection = renderer.scene.CameraProjection.ORTHO;
            cam.orthoHeight = 10;
            cam.near = 1;
            cam.far = 50;
            cam.node.setPosition(0, 0, -10);
            cam.node.forward = Vec3.UNIT_Z;
        }

        cam.node.parent = model;
        this._camera.targetTexture = this._rt;
    }
}