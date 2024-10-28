import { CCInteger, Component, MeshRenderer, Vec3, Vec4, _decorator, director, renderer } from "cc";
import { LogicLight } from "./LogicLight";
import { EDITOR } from "cc/env";
import { logicLightUtil } from "./LogicLightUtil";
import { LightType, kLightColorOffset, kLightDatasKey, kLightDirOffset, kLightF32Count, kLightPosOffset, kLightSizeRangeAngleOffset, kMaxAdditiveLight, kRealityLightNumKey } from "./LogicLightDefines";

const { ccclass, requireComponent, executeInEditMode, property } = _decorator;

const tempV3 = new Vec3();
const vec4Array = new Float32Array(4);

@ccclass('InstancedLogicLightReceiver')
@requireComponent(MeshRenderer)
@executeInEditMode
export class InstancedLogicLightReceiver extends Component {
    @property({ range: [1, kMaxAdditiveLight], type: CCInteger })
    maxLight: number = 1;
    @property
    bakeable: boolean = true;
    @property({ visible: function () { return this.bakeable; } })
    get bake(): boolean { return false; }
    set bake(value: boolean) {
        if (value)
            this._rebake();
    }
    @property({ visible: function () { return this.bakeable; } })
    get clearBakedata(): boolean { return false; }
    set clearBakedata(value: boolean) {

    }
    @property({ type: [LogicLight], readonly: true, displayName: 'LinkedLights' })
    private _linkedLights: LogicLight[] = [];
    @property
    get bakeAll(): boolean { return false; }
    set bakeAll(value: boolean) {
        if (value) {
        }
    }
    @property
    get clearAllBakedata(): boolean { return false; }
    set clearAllBakedata(value: boolean) {
        if (value) {

        }
    }

    private static readonly _lightReceivers: InstancedLogicLightReceiver[] = [];
    private static readonly _lightIndices: number[] = [];
    private _lightNum: number = 0;
    private _lightDatas = new Float32Array(kMaxAdditiveLight * kLightF32Count);

    start() {
        if (!EDITOR && this.bakeable)
            this.bake = true;
    }

    onEnable() {
        InstancedLogicLightReceiver._lightReceivers.push(this);
    }

    onDisable() {
        let idx = InstancedLogicLightReceiver._lightReceivers.indexOf(this);
        if (idx >= 0) {
            InstancedLogicLightReceiver._lightReceivers[idx] = null;
            logicLightUtil.arrayRemove(InstancedLogicLightReceiver._lightReceivers, null);
        }
    }

    private _rebake() {
        this._gatherLights();
    }

    private _lightCulling(model: renderer.scene.Model, lights: LogicLight[]): ReadonlyArray<number> {
        const lightIndices = InstancedLogicLightReceiver._lightIndices;
        for (let i = 0, len = lights.length; i < len; ++i) {
            const light = lights[i].sceneLight;
            let isCulled = false;
            switch (<number>light.type) {
                case LightType.Sphere:
                    isCulled = logicLightUtil.cullSphereLight(
                        light as renderer.scene.SphereLight,
                        model
                    )
                    break;
                case LightType.Spot:
                    isCulled = logicLightUtil.cullSpotLight(
                        light as renderer.scene.SpotLight,
                        model
                    );
                    break;
            }
            if (!isCulled)
                lightIndices.push(i);
        }
        return lightIndices;
    }

    private _gatherLights() {
        const linkedLights = this._linkedLights;
        linkedLights.length = 0;
        const allLights = LogicLight.allLights;
        const node = this.node;
        const renderer = node.getComponent(MeshRenderer);
        const model = renderer.model;
        const lightIndices = this._lightCulling(model, allLights);
        if (lightIndices.length === 0) {
            this._clearLights(renderer);
            return;
        }

        for (let i = 0, len = lightIndices.length; i < len; ++i)
            linkedLights.push(allLights[lightIndices[i]]);
        if (linkedLights.length > this.maxLight) {
            const lightWithDistance = linkedLights.map(v => {
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
                linkedLights[i] = lightWithDistance[i][0]
        }
        this._updateLightDatas(linkedLights);

        renderer.setInstancedAttribute(kRealityLightNumKey, [this._lightNum]);
        renderer.setInstancedAttribute(kLightDatasKey, this._lightDatas);
    }

    private _clearLights(renderer?: MeshRenderer) {
        this._lightNum = 0;
        this._lightDatas.fill(0);
        renderer = renderer ?? this.getComponent(MeshRenderer);
        renderer.setInstancedAttribute(kRealityLightNumKey, [this._lightNum]);
        renderer.setInstancedAttribute(kLightDatasKey, this._lightDatas);
    }

    private _updateLightDatas(lights: LogicLight[]) {
        type SceneSphereLight = renderer.scene.SphereLight;
        type SceneSpotLight = renderer.scene.SpotLight;

        this._lightNum = lights.length;
        const lightDatas = this._lightDatas;
        const isHDR = director.root.pipeline.pipelineSceneData.isHDR;
        for (let i = 0, len = lights.length; i < len; ++i) {
            const offset = i * kLightF32Count;
            const { sceneLight } = lights[i];

            switch (<number>sceneLight.type) {
                case LightType.Sphere:
                    // position
                    Vec3.toArray(vec4Array, sceneLight.node.worldPosition);
                    vec4Array[3] = 0;
                    lightDatas.set(vec4Array, offset + kLightPosOffset);

                    // size range angle
                    vec4Array[0] = (sceneLight as SceneSphereLight).size;
                    vec4Array[1] = (sceneLight as SceneSphereLight).range;
                    vec4Array[2] = 0;
                    vec4Array[3] = 0;
                    lightDatas.set(vec4Array, offset + kLightSizeRangeAngleOffset);

                    // color
                    Vec3.toArray(vec4Array, sceneLight.color);
                    if (sceneLight.useColorTemperature) {
                        const tempRGB = sceneLight.colorTemperatureRGB;
                        vec4Array[0] *= tempRGB.x;
                        vec4Array[1] *= tempRGB.y;
                        vec4Array[2] *= tempRGB.z;
                    }
                    if (isHDR)
                        vec4Array[3] = (sceneLight as SceneSphereLight).luminanceHDR;
                    else
                        vec4Array[3] = (sceneLight as SceneSphereLight).luminanceLDR;
                    lightDatas.set(vec4Array, offset + kLightColorOffset);

                    // no dir
                    Vec4.toArray(vec4Array, Vec4.ZERO);
                    lightDatas.set(vec4Array, offset + kLightDirOffset);
                    break;
                case LightType.Spot:
                    // position
                    Vec3.toArray(vec4Array, sceneLight.node.worldPosition);
                    vec4Array[3] = 1;
                    lightDatas.set(vec4Array, offset + kLightPosOffset);

                    // size range angle
                    vec4Array[0] = (sceneLight as SceneSpotLight).size;
                    vec4Array[1] = (sceneLight as SceneSpotLight).range;
                    vec4Array[2] = (sceneLight as SceneSpotLight).spotAngle;
                    vec4Array[3] = 0;
                    lightDatas.set(vec4Array, offset + kLightSizeRangeAngleOffset);

                    // color
                    Vec3.toArray(vec4Array, sceneLight.color);
                    if (sceneLight.useColorTemperature) {
                        const tempRGB = sceneLight.colorTemperatureRGB;
                        vec4Array[0] *= tempRGB.x;
                        vec4Array[1] *= tempRGB.y;
                        vec4Array[2] *= tempRGB.z;
                    }
                    if (isHDR)
                        vec4Array[3] = (sceneLight as SceneSpotLight).luminanceHDR;
                    else
                        vec4Array[3] = (sceneLight as SceneSpotLight).luminanceLDR;
                    lightDatas.set(vec4Array, offset + kLightColorOffset);

                    // dir
                    Vec3.toArray(vec4Array, (sceneLight as SceneSpotLight).direction);
                    vec4Array[3] = 0;
                    lightDatas.set(vec4Array, offset + kLightDirOffset);
                    break;
            }
        }
    }
}