import { _decorator, Component, Camera, Vec3, Node, Quat } from "cc";
import { HashList } from "../data/HashList";

const { ccclass, property, requireComponent } = _decorator;

export interface IWorldToUITrackable {
    /** 唯一id */
    readonly uuid: string|number;
    /** 3d实体的world position */
    readonly entityWorldPos: Readonly<Vec3>;
    /** ui节点的容器 */
    readonly uiContainer: Node;

    setWorldToUIPos: (pos: Readonly<Vec3>) => void;
    setWorldToUIScale: (scale: number) => void;
}

type TrackableInternal = {
    _lastEntityWorldPos: Vec3;
}&IWorldToUITrackable

const transformPos = new Vec3();
const viewPos = new Vec3();

/**
 * 从3d节点映射坐标到ui节点，
 * 参照UICoordinateTracker实现
 */
@ccclass('WorldToUITracker')
@requireComponent(Camera)
export class WorldToUITracker extends Component {
    @property({ displayName: '是否缩放映射' })
    useScale: boolean = true;
    @property({
        tooltip: '距离相机多少距离为正常显示计算大小',
        displayName: '焦点距离',
        visible: function () { return this.useScale; }
    })
    distance: number = 5;

    worldCamera: Camera;

    private _lastCamPos = new Vec3(-1000, -1000, -1000);
    private _trackables: HashList<TrackableInternal> = new HashList();

    onLoad() {
        this.worldCamera = this.getComponent(Camera);
        // 这是一个映射摄像机，常态下它是不需要渲染任何东西的，只用作坐标转换
        // this.worldCamera.enabled = false;
    }

    register(trackable: IWorldToUITrackable) {
        const _t = trackable as TrackableInternal;
        if (!_t._lastEntityWorldPos)
            _t._lastEntityWorldPos = new Vec3(-1000, -1000, -1000);
        this._trackables.add(_t.uuid, _t);
    }

    unregister(trackable: IWorldToUITrackable) {
        this._trackables.del(trackable.uuid);
    }

    contains(trackable: IWorldToUITrackable) {
        return !!this._trackables.get(trackable.uuid);
    }

    update(dt: number) {
        const camera = this.worldCamera;
        if (!camera || !camera.camera)
            return;
        // 在摄像机组件之后即可
        // camera.camera.update();
        const cameraPosChanged = !this._lastCamPos.equals(camera.node.worldPosition);
        this._lastCamPos.set(camera.node.worldPosition);

        const useScale = this.useScale;
        let cur = this._trackables.head;
        const tail = this._trackables.tail;
        while ((cur = cur.next) != tail) {
            const data = cur.data;
            const entityPosChanged = !data._lastEntityWorldPos.equals(data.entityWorldPos);
            data._lastEntityWorldPos.set(data.entityWorldPos);
            if (cameraPosChanged || entityPosChanged) {
                camera.convertToUINode(data.entityWorldPos, data.uiContainer, transformPos);
                data.setWorldToUIPos(transformPos);
                if (useScale) {
                    Vec3.transformMat4(viewPos, data.entityWorldPos, camera.camera.matView);
                    const scale = this.distance / Math.abs(viewPos.z);
                    data.setWorldToUIScale(scale);
                }
            }
        }
    }

    convert(worldPos3d: Readonly<Vec3>, uiContainer: Node): Readonly<Vec3> {
        const camera = this.worldCamera;
        if (!camera || !camera.camera)
            return;
        camera.convertToUINode(worldPos3d, uiContainer, transformPos);
        return transformPos;
    }
}