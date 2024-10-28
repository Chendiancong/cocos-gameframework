import { _decorator, Color, Component, gfx, Material, Mesh, MeshRenderer, murmurhash2_32_gc, primitives, utils, Vec3, Vec4 } from 'cc';
const { ccclass, property, requireComponent, executeInEditMode } = _decorator;

// 其实在这里设置isInstanced是无效的，要在shader里面使用USE_INSTANCING宏里面定义这个属性
const kInstancedBarParamsAttribute = new gfx.Attribute('a_instanced_bar_params', gfx.Format.RGBA32F, void 0, void 0, true);
const kInstancedColorAttribute = new gfx.Attribute('a_instanced_mix_color', gfx.Format.RGBA32F, void 0, void 0, true);
const kInstancedPositionScaleAttribute = new gfx.Attribute('a_instanced_position_scale', gfx.Format.RGB32F, void 0, void 0, true);
const kBarParamsElementNum = 4;
const kColorElementNum = 4;
const kPositionScaleElementNum = 3;
const kF32Byte = Float32Array.BYTES_PER_ELEMENT;

type F32ArrayAndView = { values: Float32Array, view: DataView }
type InstancedData = {
    barParams?: F32ArrayAndView, color?: F32ArrayAndView,
    positionScale?: F32ArrayAndView
}

type MeshInfo = {
    mesh: Mesh,
    vertexNum: number,
    triangleNum: number,
    geometry?: primitives.IGeometry,
    dynamicGeometry?: primitives.IDynamicGeometry,
    instancedData?: InstancedData

}

type PassHandle = {
    passIdx: number;
    handle: number;
}

@ccclass('Bar3d')
@requireComponent([MeshRenderer])
@executeInEditMode
export class Bar3d extends Component {
    @property(Material)
    material: Material = null;
    @property({ min: 0.01 })
    width: number = 1;
    @property({ min: 0.01 })
    height: number = 0.2;
    @property(Color)
    barColor: Color = new Color(Color.WHITE);
    @property
    gpuInstance = true;
    @property
    autoCreate = true;

    private _curMeshInfo: MeshInfo;

    @property
    get editorCreate() { return false; }
    set editorCreate(value: boolean) {
        if (value)
            this.createBar();
    }

    @property({ serializable: true })
    private _progressValue: number = 1;
    get progressValue() { return this._progressValue; }
    set progressValue(val: number) {
        if (Math.abs(this._progressValue - val) > 1e-5) {
            this._progressValue = val;
            this._onProgressValueChange();
        }
    }

    private _renderer: MeshRenderer;
    get renderer() {
        if (this._renderer == void 0)
            this._renderer = this.getComponent(MeshRenderer);
        return this._renderer;
    }

    private _barHandles: PassHandle[];

    get barHandles() {
        if (this._barHandles == void 0)
            this._barHandles = this._initHandles('progressValue');
        return this._barHandles;
    }

    start() {
        if (this.autoCreate)
            this.createBar();
    }

    createBar() {
        const renderer = this.renderer;
        renderer.setSharedMaterial(this.material, 0);
        Bar3d._createStaticQuadMesh(this);
        const meshInfo = this._curMeshInfo;
        renderer.mesh = meshInfo.mesh;

        if (this.gpuInstance) {
            Bar3d._updateInstancedColorData(
                meshInfo.instancedData.color,
                1,
                this.barColor
            );
            renderer.setInstancedAttribute(
                kInstancedColorAttribute.name,
                meshInfo.instancedData.color.values
            );

            Bar3d._updateInstancedPositionScaleData(
                meshInfo.instancedData.positionScale,
                1,
                new Vec3(this.width, this.height, 1)
            );
            renderer.setInstancedAttribute(
                kInstancedPositionScaleAttribute.name,
                meshInfo.instancedData.positionScale.values
            );
        }

        this._onProgressValueChange();
    }

    private _onProgressValueChange() {
        if (this.gpuInstance) {
            const meshInfo = this._curMeshInfo;
            if (meshInfo?.mesh?.isValid) {
                Bar3d._updateInstancedBarParamsData(
                    meshInfo.instancedData.barParams,
                    1,
                    this._progressValue
                );
                this.renderer.setInstancedAttribute(
                    kInstancedBarParamsAttribute.name,
                    meshInfo.instancedData.barParams.values
                );
            }
        } else {
            const barHandles = this.barHandles;
            if (barHandles) {
                const materialIns = this.renderer.getMaterialInstance(0);
                for (const passHandle of barHandles) {
                    const pass = materialIns.passes[passHandle.passIdx];
                    if (pass)
                        pass.setUniform(passHandle.handle, this._progressValue);
                }
            }
        }
    }

    private _initHandles(attrName: string) {
        const list: PassHandle[] = [];
        const passes = this.renderer.material.passes;
        for (let i = 0, len = passes.length; i < len; ++i) {
            const handle = passes[i].getHandle(attrName);
            if (handle)
                list.push({ passIdx: i, handle });
        }

        return list;
    }

    private static _updateInstancedBarParamsData(data: F32ArrayAndView, num: number, progressValue: number) {
        const view = data.view;
        for (let i = 0; i < num; ++i) {
            const offset = i * kBarParamsElementNum;
            view.setFloat32(offset * kF32Byte, progressValue, true);
            view.setFloat32((offset + 1) * kF32Byte, 0, true);
            view.setFloat32((offset + 2) * kF32Byte, 0, true);
            view.setFloat32((offset + 3) * kF32Byte, 0, true);
        }
    }

    private static _updateInstancedColorData(data: F32ArrayAndView, num: number, color: Readonly<Color>) {
        const view = data.view;
        for (let i = 0; i < num; ++i) {
            const offset = i * kColorElementNum;
            view.setFloat32(offset * kF32Byte, color.r / 255, true);
            view.setFloat32((offset + 1) * kF32Byte, color.g / 255, true);
            view.setFloat32((offset + 2) * kF32Byte, color.b / 255, true);
            view.setFloat32((offset + 3) * kF32Byte, color.a / 255, true);
        }
    }

    private static _updateInstancedPositionScaleData(data: F32ArrayAndView, num: number, scale: Readonly<Vec3>) {
        const view = data.view;
        for (let i = 0; i < num; ++i) {
            const offset = i * kPositionScaleElementNum;
            view.setFloat32(offset * kF32Byte, scale.x, true);
            view.setFloat32((offset + 1) * kF32Byte, scale.y, true);
            view.setFloat32((offset + 2) * kF32Byte, scale.z, true);
        }
    }

    private static _createGeometry(bar: Bar3d) {
        const verNum = 4, triNum = 2;

        const positions: Float32Array = new Float32Array(verNum * 3),
            colors = new Float32Array(verNum * 4),
            uvs = new Float32Array(verNum * 2),
            indices = new Uint16Array(triNum * 3);

        const barWidth = bar.gpuInstance ? 1 : bar.width;
        const barHeight = bar.gpuInstance ? 1 : bar.height;
        const xMin = -barWidth / 2, xMax = barWidth / 2;
        const yMin = -barHeight / 2, yMax = barHeight / 2;
        let { r, g, b, a } = bar.gpuInstance ? Color.WHITE : bar.barColor;
        r /= 255;
        g /= 255;
        b /= 255;
        a /= 255;
        const vColorValues: number[] = [r, g, b, a];
        let offsetPos = 0, offsetUv = 0, offsetColor = 0;

        // left bottom
        positions.set([xMin, yMin, 0], offsetPos);
        uvs.set([0, 1], offsetUv);
        colors.set(vColorValues, offsetColor);
        // right bottom
        offsetPos += 3;
        offsetUv += 2;
        offsetColor += 4;
        positions.set([xMax, yMin, 0], offsetPos);
        uvs.set([1, 1], offsetUv);
        colors.set(vColorValues, offsetColor);
        // left top
        offsetPos += 3;
        offsetUv += 2;
        offsetColor += 4;
        positions.set([xMin, yMax, 0], offsetPos);
        uvs.set([0, 0], offsetUv);
        colors.set(vColorValues, offsetColor);
        // right top
        offsetPos += 3;
        offsetUv += 2;
        offsetColor += 4;
        positions.set([xMax, yMax, 0], offsetPos);
        uvs.set([1, 0], offsetUv);
        colors.set(vColorValues, offsetColor);

        indices.set([0, 1, 2], 0);
        indices.set([2, 1, 3], 3);

        const minPos = { x: xMin, y: yMin, z: 0 };
        const maxPos = { x: xMax, y: yMax, z: 0 };

        const customAttributes: { attr: gfx.Attribute, values: Float32Array }[] = [];
        const instancedData: InstancedData = {};
        if (bar.gpuInstance) {
            // 设置instance attribute的数据都是单个顶点的
            let instancedValues = new Float32Array(kBarParamsElementNum);
            let instancedView = new DataView(instancedValues.buffer);
            instancedData.barParams = { values: instancedValues, view: instancedView };

            instancedValues = new Float32Array(kColorElementNum);
            instancedView = new DataView(instancedValues.buffer);
            instancedData.color = { values: instancedValues, view: instancedView };

            instancedValues = new Float32Array(kPositionScaleElementNum);
            instancedView = new DataView(instancedValues.buffer);
            instancedData.positionScale = { values: instancedValues, view: instancedView };
        }

        return {
            positions, uvs, colors, indices,
            minPos, maxPos,
            customAttributes,
            vertexNum: verNum,
            triangleNum: triNum,
            instancedData
        };
    }

    private static _staticMeshInfos: Record<number, MeshInfo> = {};
    private static _createStaticQuadMesh(bar: Bar3d) {
        const hashInput = bar.gpuInstance ? `1,1,000` : `${bar.width},${bar.height},${bar.barColor._val}`;
        const key = murmurhash2_32_gc(hashInput, 666);

        let meshInfo: MeshInfo;
        if (this._staticMeshInfos[key]) {
            meshInfo = this._staticMeshInfos[key];
        } else {
            const {
                positions, uvs, colors, indices,
                minPos, maxPos,
                customAttributes,
                vertexNum, triangleNum, instancedData
            } = this._createGeometry(bar);

            const geo: primitives.IGeometry = {
                positions: [...positions],
                uvs: [...uvs],
                colors: [...colors],
                indices: [...indices],
                minPos,
                maxPos,
                customAttributes: customAttributes.map(v => ({ attr: v.attr, values: [...v.values] }))
            };
            const mesh = utils.MeshUtils.createMesh(geo, void 0, { calculateBounds: true });

            meshInfo = {
                mesh,
                vertexNum,
                triangleNum,
                geometry: geo,
                instancedData
            };
            this._staticMeshInfos[key] = meshInfo;
        }

        bar._curMeshInfo = meshInfo;
    }

    private static _createDynamicQuadMesh(bar: Bar3d) {
        const {
            positions, uvs, colors, indices,
            minPos, maxPos,
            customAttributes,
            vertexNum, triangleNum
        } = this._createGeometry(bar);

        const geo: primitives.IDynamicGeometry = {
            positions, uvs, colors, indices16: indices,
            minPos, maxPos,
            customAttributes
        }

        const curMeshInfo = bar._curMeshInfo;
        if (curMeshInfo?.mesh?.isValid) {
            curMeshInfo.mesh.updateSubMesh(0, geo);
            curMeshInfo.dynamicGeometry = geo;
            curMeshInfo.vertexNum = vertexNum;
            curMeshInfo.triangleNum = triangleNum;
        } else {
            const mesh = utils.MeshUtils.createDynamicMesh(0, geo);
            bar._curMeshInfo = {
                mesh,
                vertexNum,
                triangleNum,
                dynamicGeometry: geo,
            };
        }
    }
}