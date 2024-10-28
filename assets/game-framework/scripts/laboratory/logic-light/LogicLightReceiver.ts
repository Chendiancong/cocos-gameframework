import { _decorator, Component, MeshRenderer, renderer, geometry, CCInteger, gfx, director, Vec3, v3, ModelRenderer } from 'cc';
import { kLightBufferSize, kLightColorElementCount, kLightColorOffset, kLightDirElementCount, kLightDirOffset, kLightNumOffset, kLightPosElementCount, kLightPosOffset, kLightSizeRangeAngleElementCount, kLightSizeRangeAngleOffset, kMaxAdditiveLight, kUBOAdditiveLightBinding, LightType } from './LogicLightDefines';
import { LogicLight } from './LogicLight';
import { logicLightUtil } from './LogicLightUtil';
import { EDITOR } from 'cc/env';
const { ccclass, property, requireComponent, executeInEditMode } = _decorator;
const { intersect } = geometry;
const { BufferInfo, BufferUsageBit, MemoryUsageBit } = gfx;

type Model = renderer.scene.Model;
type SubModel = renderer.scene.SubModel;
type SceneCamera = renderer.scene.Camera;
type SphereLight = renderer.scene.SphereLight;
type SpotLight = renderer.scene.SpotLight;

const lightIndices: number[] = [];
const lightModelPassIndices: number[] = [];
const tempV3 = v3();
const getLightPassRet = {
    modelPassIndices: lightModelPassIndices,
    hasLightPass: false,
}
const vec4Array = new Float32Array(4);
let _lightPhaseID: number;
function getLightPhaseID() {
    if (_lightPhaseID == void 0) {
        _lightPhaseID = logicLightUtil.getPhaseId("multi-lighting-forward");
    }
    return _lightPhaseID;
}

const _targetDefine = 'MULTIPLE_LIGHTING';

function cullSphereLight(sceneLight: SphereLight, model: Model) {
    return !!(model.worldBounds && !intersect.aabbWithAABB(model.worldBounds, sceneLight.aabb));
}

function cullSpotLight(sceneLight: SpotLight, model: Model) {
    return !!(model.worldBounds && (!intersect.aabbWithAABB(model.worldBounds, sceneLight.aabb) || !intersect.aabbFrustum(model.worldBounds, sceneLight.frustum)));
}

function getLightPassIndices(subModels: SubModel[]) {
    lightModelPassIndices.length = 0;
    let hasLightPass = false;
    for (let i = 0, len = subModels.length; i < len; ++i) {
        let passes = subModels[i].passes;
        let lightPassIndex = -1;
        for (let k  = 0, kl = passes.length; i < kl; ++k) {
            if (passes[k].defines[_targetDefine]) {
                lightPassIndex = k;
                hasLightPass = true;
                break;
            }
        }
        if (lightPassIndex >= 0)
            lightModelPassIndices.push(i, lightPassIndex);
    }
    getLightPassRet.hasLightPass = hasLightPass;
    return getLightPassRet;
}

/**
 * 通过设置pass buffer的方式支持在forwardBase过程中一次性多光源计算，不支持不同光源条件下的合批，
 * @deprecated
 */
@ccclass('LogicLightReceiver')
@requireComponent(MeshRenderer)
@executeInEditMode
export class LogicLightReceiver extends Component {
    @property({ range: [0, kMaxAdditiveLight], type: CCInteger })
    maxLight: number = 1;
    @property
    bakeable: boolean = true;
    @property({ visible: function() { return this.bakeable; } })
    get bake(): boolean {
        return false;
    }
    set bake(value: boolean) {
        if (value) {
            this._initalize();
            this.gatherLights();
        }
    }
    @property({ visible: function() { return this.bakeable } })
    get clearBakedata(): boolean {
        return false;
    }
    set clearBakedata(value: boolean) {
        if (value)
            this.linkedLights.length = 0;
    }
    @property({ type: [LogicLight], readonly: true })
    linkedLights: LogicLight[] = [];
    @property
    get bakeAll(): boolean {
        return false;
    }
    set bakeAll(value: boolean) {
        if (value) {
            for (let l of LogicLightReceiver._lightReceivers) {
                if (l.bakeable)
                    l.bake = true;
            }
        }
    }
    @property
    get clearAllBakedata(): boolean {
        return false;
    }
    set clearAllBakedata(value: boolean) {
        if (value) {
            for (let l of LogicLightReceiver._lightReceivers) {
                l.linkedLights.length = 0;
            }
        }
    }

    private static _lightReceivers: LogicLightReceiver[] = [];
    private _bufferData: Float32Array;
    private _buffer: gfx.Buffer;
    private _inited: boolean = false;

    start() {
        if (!EDITOR && this.bakeable)
            this.bake = true;
    }

    onEnable() {
        LogicLightReceiver._lightReceivers.push(this);
    }

    onDisable() {
        let idx = LogicLightReceiver._lightReceivers.indexOf(this);
        if (idx >= 0) {
            LogicLightReceiver._lightReceivers[idx] = null;
            logicLightUtil.arrayRemove(LogicLightReceiver._lightReceivers, null);
        }
    }

    gatherLights() {
        let linkedLights = this.linkedLights;
        linkedLights.length = 0;
        let allLights = LogicLight.allLights;
        let node = this.node;
        let model = node.getComponent(MeshRenderer).model;
        let camera = director.root.curWindow.cameras[0];
        if (camera == void 0)
            return;
        let lightIndices = this._lightCulling(model, allLights);
        if (lightIndices.length == 0)
            return;
        for (let i = 0, len = lightIndices.length; i < len; ++i)
            linkedLights.push(allLights[lightIndices[i]]);
        if (linkedLights.length > this.maxLight) {
            let lightWithDistance = linkedLights.map(v => {
                return [
                    v,
                    tempV3.set(node.worldPosition)
                        .subtract(v.node.worldPosition)
                        .lengthSqr()
                ]
            }) as [LogicLight, number][];
            lightWithDistance.sort((a, b) => a[1] - b[1]);
            lightWithDistance.length = this.maxLight;
            linkedLights.length = this.maxLight;
            for (let i = 0, len = this.maxLight; i < len; ++i)
                linkedLights[i] = lightWithDistance[i][0];
        }
        let subModels = model.subModels;
        let getPassRet = getLightPassIndices(subModels);
        if (!getPassRet.hasLightPass)
            return;
        this._updateUBO(camera, director.root.device.commandBuffer);
        let indices = getPassRet.modelPassIndices;
        for (let i = 0, len = indices.length; i < len; i += 2) {
            let modelIdx = indices[i], passIdx = indices[i+1];
            if (passIdx < 0)
                continue;
            let model = subModels[modelIdx];
            let pass = model.passes[passIdx];
            pass.descriptorSet.bindBuffer(kUBOAdditiveLightBinding, this._buffer);
            pass.descriptorSet.update();
        }
    }

    private _initalize() {
        if (this._inited)
            return;
        this._inited = true;
        let device = director.root.device;
        let alignment = device.capabilities.uboOffsetAlignment;
        let stride = Math.ceil(kLightBufferSize/alignment) * alignment;
        let bufferElementCount = stride/Float32Array.BYTES_PER_ELEMENT;
        this._buffer = device.createBuffer(
            new BufferInfo(
                BufferUsageBit.UNIFORM | BufferUsageBit.TRANSFER_DST,
                MemoryUsageBit.HOST | MemoryUsageBit.DEVICE,
                this.maxLight * stride,
                stride
            )
        );
        this._bufferData = new Float32Array(bufferElementCount * this.maxLight);
    }

    private _lightCulling(model: Model, lights: LogicLight[]): ReadonlyArray<number> {
        lightIndices.length = 0;
        for (let i = 0, len = lights.length; i < len; ++i) {
            const light = lights[i].sceneLight;
            let isCulled = false;
            switch (<number>light.type) {
                case LightType.Sphere:
                    isCulled = cullSphereLight(light as SphereLight, model);
                    break;
                case LightType.Spot:
                    isCulled = cullSpotLight(light as SpotLight, model);
                    break;
            }
            if (!isCulled) {
                lightIndices.push(i);
            }
        }
        return lightIndices;
    }

    private _updateUBO(camera: SceneCamera, cmdBuff: gfx.CommandBuffer) {
        let lights = this.linkedLights;
        let pipeline = director.root.pipeline;
        let exposure = camera.exposure;
        let sceneData = pipeline.pipelineSceneData;
        let isHDR = sceneData.isHDR;
        let bufferData = this._bufferData;

        for (let i = 0, len = lights.length; i < len; ++i) {
            let logicLight = lights[i];
            let sceneLight = logicLight.sceneLight;
            switch(<number>sceneLight.type) {
                case LightType.Sphere:
                    // Vec3.toArray(vec4Array, (sceneLight as SphereLight).position);
                    Vec3.toArray(vec4Array, lights[i].node.position);
                    vec4Array[3] = 0;
                    bufferData.set(vec4Array, kLightPosOffset + i * kLightPosElementCount);

                    vec4Array[0] = (sceneLight as SphereLight).size;
                    vec4Array[1] = (sceneLight as SphereLight).range;
                    vec4Array[2] = 0;
                    vec4Array[3] = 0;
                    bufferData.set(vec4Array, kLightSizeRangeAngleOffset + i * kLightSizeRangeAngleElementCount);

                    Vec3.toArray(vec4Array, sceneLight.color);
                    if (sceneLight.useColorTemperature) {
                        const tempRGB = sceneLight.colorTemperatureRGB;
                        vec4Array[0] *= tempRGB.x;
                        vec4Array[1] *= tempRGB.y;
                        vec4Array[2] *= tempRGB.z;
                    }
                    if (isHDR) {
                        vec4Array[3] = (sceneLight as SphereLight).luminance * exposure * logicLight.lightMeterScale;
                    } else {
                        vec4Array[3] = (sceneLight as SphereLight).luminance;
                    }
                    bufferData.set(vec4Array, kLightColorOffset + i * kLightColorElementCount);

                    //no dir
                    vec4Array[0] = vec4Array[1] = vec4Array[2] = vec4Array[3] = 0;
                    bufferData.set(vec4Array, kLightDirOffset + i * kLightDirElementCount);
                    break;
                case LightType.Spot:
                    // Vec3.toArray(vec4Array, (sceneLight as SpotLight).position);
                    Vec3.toArray(vec4Array, lights[i].node.position);
                    vec4Array[3] = 1;
                    bufferData.set(vec4Array, kLightPosOffset + i * kLightPosElementCount);

                    vec4Array[0] = (sceneLight as SpotLight).size;
                    vec4Array[1] = (sceneLight as SpotLight).range;
                    vec4Array[2] = (sceneLight as SpotLight).spotAngle;
                    vec4Array[3] = 0;
                    bufferData.set(vec4Array, kLightSizeRangeAngleOffset + i * kLightSizeRangeAngleElementCount)

                    Vec3.toArray(vec4Array, (sceneLight as SpotLight).direction);
                    bufferData.set(vec4Array, kLightDirOffset + i * kLightDirElementCount);

                    Vec3.toArray(vec4Array, sceneLight.color);
                    if (sceneLight.useColorTemperature) {
                        const tempRGB = sceneLight.colorTemperatureRGB;
                        vec4Array[0] *= tempRGB.x;
                        vec4Array[1] *= tempRGB.y;
                        vec4Array[2] *= tempRGB.z;
                    }
                    if (isHDR) {
                        vec4Array[3] = (sceneLight as SpotLight).luminance * exposure * logicLight.lightMeterScale;
                    } else {
                        vec4Array[3] = (sceneLight as SpotLight).luminance;
                    }
                    bufferData.set(vec4Array, kLightColorOffset + i * kLightColorElementCount);
                    break;
            }
        }
        bufferData.set([lights.length], kLightNumOffset);

        cmdBuff.updateBuffer(this._buffer, bufferData);
    }
}