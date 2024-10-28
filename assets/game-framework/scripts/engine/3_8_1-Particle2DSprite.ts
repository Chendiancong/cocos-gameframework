import { _decorator, Component, ParticleSystem2D, Vec2, Color, MeshRenderData, __private, Enum, lerp, CCInteger, SpriteFrame, isValid } from 'cc';
import { aspects } from '../utils/Aspects';
import { gMath } from '../utils/math/MathUtil';
import { supportVersions } from './SupportVersions';
const { ccclass, property, requireComponent, executeInEditMode, playOnFocus } = _decorator;

const { engineVersion } = aspects;

type ParticleSimulator = __private._cocos_particle_2d_particle_simulator_2d__Simulator&{
    sys: ParticleSystem2D
}

enum FrameSortType {
    SingleRow,
    MultiRow
}
Enum(FrameSortType);

function frameSortTypeIs(targetType: FrameSortType) {
    return function (this: Particle2DSprite) {
        return this.sortType == targetType;
    }
}

class UV {
    declare u: number;
    declare v: number;

    constructor(u: number, v: number) {
        this.set(u, v);
    }

    set(u: number, v: number) {
        this.u = u;
        this.v = v;
    }
}
type FrameUV = {
    bl: UV, br: UV, tl: UV, tr: UV
}
const frameUV: FrameUV = {
    bl: new UV(0, 1),
    br: new UV(1, 1),
    tl: new UV(0, 0),
    tr: new UV(0, 1)
}

@ccclass('3_8_1-Particle2DSprite')
@requireComponent([ParticleSystem2D])
@executeInEditMode
@playOnFocus
export class Particle2DSprite extends Component {
    @property({ type: FrameSortType, displayName: '精灵排布方式' })
    sortType: FrameSortType = FrameSortType.SingleRow;
    @property({ type: CCInteger, displayName: '行数', visible: frameSortTypeIs(FrameSortType.MultiRow) })
    rowNum: number = 1;
    @property({ type: CCInteger, displayName: '列数' })
    columnNum: number = 1;
    @property({ type: CCInteger, min: 1 })
    get fps() { return this._fps; }
    set fps(value: number) {
        this._fps = value;
        this._frameTimeSec = 1/this.fps;
    }
    @property({ serializable: true })
    private _fps: number = 30;
    @property({ displayName: '精灵粒子旋转', tooltip: '最终单个粒子旋转=x+random(-y/2, y/2)' })
    rotation: Vec2 = new Vec2();

    private _frameSize = new Vec2();
    declare private _frameTimeSec: number;
    declare private _particleSystem: ParticleSystem2D;

    get frameSize(): Readonly<Vec2> {
        return this._frameSize;
    }

    updateFrameUV(particle: Particle): RecursiveReadonly<FrameUV> {
        const frameId = particle.frameId;
        const {
            sortType, columnNum, rowNum
        } = this;
        let left: number, right: number,
            bottom: number, top: number;
        // uv原点位于左上角，向左向下为正方向
        if (sortType == FrameSortType.SingleRow) {
            const columnIdx = frameId % columnNum;
            left = columnIdx / columnNum;
            right = (columnIdx + 1) / columnNum;
            bottom = 1;
            top = 0;
        } else {
            const rowIdx = Math.floor(frameId / columnNum) % rowNum;
            const columnIdx = (frameId - rowIdx * columnNum) % columnNum;
            left  = columnIdx / columnNum;
            right = (columnIdx + 1) / columnNum;
            // bottom = (rowIdx + 1) / rowNum;
            // top = rowIdx / rowNum;
            // 需要上下翻转
            bottom = 1 - rowIdx / rowNum;
            top = 1 - Math.min(1, (rowIdx + 1) / rowNum);
        }

        frameUV.bl.set(left, bottom);
        frameUV.br.set(right, bottom);
        frameUV.tl.set(left, top);
        frameUV.tr.set(right, top);

        return frameUV;
    }

    onEnable() {
        this._inject();

        this._frameTimeSec = 1/this._fps;
    }

    onDisable() {
        this._revert();
    }

    update(dt: number) {
        const psys = this._particleSystem;
        if (isValid(psys)) {
            {
                // calculate frame size
                const spriteFrame = psys._renderSpriteFrame;
                this._frameSize.set(
                    spriteFrame.width/this.columnNum,
                    this.sortType === FrameSortType.SingleRow ?
                        spriteFrame.height :
                        spriteFrame.height / this.rowNum
                );
            }

            const particles = psys._simulator.particles;
            const frameTime = this._frameTimeSec;
            for (let i = 0, len = particles.length; i < len; ++i) {
                const p = particles[i] as any as Particle;
                let cntDeltaTime = p.cntDeltaTime + dt;
                let frameId = p.frameId;
                if (cntDeltaTime >= frameTime) {
                    cntDeltaTime -= frameTime;
                    frameId += 1;
                }
                p.cntDeltaTime = cntDeltaTime;
                p.frameId = frameId;
            }
        }
    }

    /** 注入代码以支持帧动画 */
    @engineVersion(supportVersions._3_8_x)
    private _inject() {
        const particle = this._particleSystem = this.getComponent(ParticleSystem2D);
        const simulator = particle._simulator;
        //@ts-ignore
        const old_emitParticle = simulator.__proto__.emitParticle as Function;
        //@ts-ignore
        const old_updateUVS = simulator.__proto__.updateUVs as Function;
        //@ts-ignore
        const old_updateParticleBuffers = simulator.__proto__.updateParticleBuffer as Function;

        simulator.updateUVs = function () { //TODO
            // 在updateParticleBuffer中设置uv
        };

        simulator.updateParticleBuffer = createUpdateParticleBufferFunc(this);

        simulator.emitParticle = function () {
            old_emitParticle.call(this, ...arguments);
            // 发射粒子时进行重置
            const newParticle: Particle = <any>simulator.particles[simulator.particles.length - 1];
            newParticle.frameId = 0;
            newParticle.cntDeltaTime = 0;
            delete newParticle.stableRotation;
        }
    }

    @engineVersion(supportVersions._3_8_x)
    private _revert() {
        const particle = this._particleSystem;
        if (isValid(particle)) {
            const simulator = particle._simulator;
            delete simulator.updateUVs;
            delete simulator.updateParticleBuffer;
            delete simulator.emitParticle;
        }
    }
}

function createUpdateParticleBufferFunc(agent: Particle2DSprite) {
    return function (this: ParticleSimulator, particle: Particle, pos: Vec2, renderData: MeshRenderData, offset: number) {
        const vbuf = renderData.vData;

        const { x, y } = pos;
        let { x: width, y: height } = agent.frameSize;
        // 忽略长宽比，size只代表宽度，取之与frameWidth的比值来缩放frameHeight
        const ratio = particle.size/width;
        width = particle.size;
        height *= ratio;
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        if (particle.stableRotation == void 0) {
            const halfY = agent.rotation.y/2;
            particle.stableRotation = agent.rotation.x + gMath.randomRange(-halfY, halfY);
        }

        const rotation = particle.rotation + particle.stableRotation;
        if (rotation) {
            const x1 = -halfWidth;
            const y1 = -halfHeight;
            const x2 = halfWidth;
            const y2 = halfHeight;
            const rad = -gMath.degree2Rad(rotation);
            const cr = Math.cos(rad);
            const sr = Math.sin(rad);
            // bl
            vbuf[offset] = x1 * cr - y1 * sr + x;
            vbuf[offset + 1] = x1 * sr + y1 * cr + y;
            vbuf[offset + 2] = 0;
            // br
            vbuf[offset + 9] = x2 * cr - y1 * sr + x;
            vbuf[offset + 10] = x2 * sr + y1 * cr + y;
            vbuf[offset + 11] = 0;
            // tl
            vbuf[offset + 18] = x1 * cr - y2 * sr + x;
            vbuf[offset + 19] = x1 * sr + y2 * cr + y;
            vbuf[offset + 20] = 0;
            // tr
            vbuf[offset + 27] = x2 * cr - y2 * sr + x;
            vbuf[offset + 28] = x2 * sr + y2 * cr + y;
            vbuf[offset + 29] = 0;
        } else {
            // bl
            vbuf[offset] = x - halfWidth;
            vbuf[offset + 1] = y - halfHeight;
            vbuf[offset + 2] = 0;
            // br
            vbuf[offset + 9] = x + halfWidth;
            vbuf[offset + 10] = y - halfHeight;
            vbuf[offset + 11] = 0;
            // tl
            vbuf[offset + 18] = x - halfWidth;
            vbuf[offset + 19] = y + halfHeight;
            vbuf[offset + 20] = 0;
            // tr
            vbuf[offset + 27] = x + halfWidth;
            vbuf[offset + 28] = y + halfHeight;
            vbuf[offset + 29] = 0;
        }

        // uv
        {
            const spriteFrame = this.sys._renderSpriteFrame;
            const uv = spriteFrame.uv;
            const frameUV = agent.updateFrameUV(particle);

            // // bl
            // vbuf[offset + 3] = uv[0];
            // vbuf[offset + 4] = uv[1];
            // // br
            // vbuf[offset + 12] = uv[2];
            // vbuf[offset + 13] = uv[3];
            // // tl
            // vbuf[offset + 21] = uv[4];
            // vbuf[offset + 22] = uv[5];
            // // tr
            // vbuf[offset + 30] = uv[6];
            // vbuf[offset + 31] = uv[7];

            // 基于原始uv进行插值
            // bl
            vbuf[offset + 3] = lerp(uv[0], uv[2], frameUV.bl.u);
            vbuf[offset + 4] = lerp(uv[1], uv[5], frameUV.bl.v);
            // br
            vbuf[offset + 12] = lerp(uv[0], uv[2], frameUV.br.u);
            vbuf[offset + 13] = lerp(uv[3], uv[7], frameUV.br.v);
            // tl
            vbuf[offset + 21] = lerp(uv[4], uv[6], frameUV.tl.u);
            vbuf[offset + 22] = lerp(uv[1], uv[5], frameUV.tl.v);
            // tr
            vbuf[offset + 30] = lerp(uv[4], uv[6], frameUV.tr.u);
            vbuf[offset + 31] = lerp(uv[3], uv[7], frameUV.tr.v);
        }

        // color
        Color.toArray(vbuf, particle.color, offset + 5);
        Color.toArray(vbuf, particle.color, offset + 14);
        Color.toArray(vbuf, particle.color, offset + 23);
        Color.toArray(vbuf, particle.color, offset + 32);
    }
}

/**
 * 粒子配置，引擎代码particle-simulator-2d.ts中定义
 */
type Particle = {
    pos: Vec2,
    startPos: Vec2,
    color: Color,
    deltaColor: { r: number, g: number, b: number, a: number },
    size: number,
    deltaSize: number,
    rotation: number,
    deltaRotation: number,
    timeToLive: number,
    drawPos: Vec2,
    aspectRatio: number,
    // Mode A
    dir: Vec2,
    radialAccel: number,
    tangentialAccel: number,
    // Mode B
    angle: number,
    degreesPersecond: number,
    radius: number,
    deltaRadius: number,
}&{
    //self define
    frameId: number,
    cntDeltaTime: number,
    frameWidth: number,
    frameHeight: number,
    stableRotation: number,
}