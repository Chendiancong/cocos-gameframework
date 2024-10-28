import { EPSILON, Quat, Vec2, Vec3, js } from "cc";

function randomRangeInt(min: number, max: number) {
    return Math.floor(randomRange(min, max))
}

function randomRange(min: number, max: number) {
    const _min = Math.min(min, max);
    const _max = Math.max(min, max);
    return _min+(_max-_min)*Math.random();
}

function clamp(value: number, min: number, max: number) {
    const _min = Math.min(min, max);
    const _max = Math.max(min, max);
    return Math.max(_min, Math.min(_max, value));
}

function almostEqual(value: number, target: number, epsilon: number = EPSILON) {
    return Math.abs(value - target) <= epsilon;
}

/**
 * 渐进移动，使cur向target移动或远离，
 * 但最终不会越过target，
 * maxDelta大于0时表示接近，小于0时表示远离
 */
function moveTowards(cur: number, target: number, maxDelta: number) {
    if (cur > target)
        return Math.max(cur - maxDelta, target);
    else
        return Math.min(cur + maxDelta, target);
}

const tempV3 = new Vec3();
const tempV3_2 = new Vec3();
const tempV3_3 = new Vec3();
const tempQuat = new Quat();
const tempV2 = new Vec2();
const tempV2_2 = new Vec2();
/**
 * 向量渐进移动，使cur向target移动或远离，
 * 但最终不会越过target，
 * maxDelta大于0时表示接近，小于0时表示远离
 */
function vec3MoveTowards(cur: Readonly<Vec3>, target: Readonly<Vec3>, maxDelta: number, out?: Vec3) {
    const _cur = tempV3.set(cur);
    const _target = tempV3_2.set(target);
    const _dir = tempV3_3;
    out = out ?? new Vec3();
    _dir.set(_target)
        .subtract(_cur);
    if (maxDelta > 0) {
        const dis = _dir.length();
        out.set(_dir.normalize())
            .multiplyScalar(Math.min(maxDelta, dis))
            .add(_cur);
    }
    else
        out.set(_dir.normalize())
            .multiplyScalar(maxDelta)
            .add(_cur);
    return out;
}


/**
 * 向量渐进旋转，使cur向target移动或远离，
 * 但最终不会越过target，
 * maxDelta大于0时表示接近，小于0时表示远离
 */
function vec3RotateTowards(cur: Readonly<Vec3>, target: Readonly<Vec3>, maxDelta: number, out?: Vec3) {
    const _cur = tempV3.set(cur);
    const _target = tempV3_2.set(target);
    const _dir = tempV3_3;
    out = out ?? new Vec3();
    const angle = rad2Degree(Vec3.angle(_cur, _target));
    let deltaDegree: number;
    if (maxDelta > 0)
        deltaDegree = -Math.min(maxDelta, angle);
    else
        deltaDegree = Math.min(angle-maxDelta, 180);
    Vec3.cross(_dir, _target, _cur);
    _dir.normalize();
    Quat.fromAxisAngle(tempQuat, _dir, degree2Rad(deltaDegree));
    Vec3.transformQuat(out, _cur, tempQuat);
    return out;
}

/**
 * 二阶贝塞尔曲线求解。
 * out = (1-t)²point1 + 2t(1-t)controlPoint + t²point2
 * @param point1 端点1
 * @param point2 端点2
 * @param controlPoint 控制点
 * @param t 插值点
 * @param out 输出
 */
function bezier2(point1: Vec3, point2: Vec3, controlPoint: Vec3, t: number, out?: Vec3) {
    out = out ?? new Vec3();
    out.set(Vec3.ZERO);
    t = clamp(t, 0, 1);

    let value = Math.pow(1 - t, 2);
    tempV3.set(point1).multiplyScalar(value);
    out.add(tempV3);

    value = 2*t*(1-t);
    tempV3.set(controlPoint).multiplyScalar(value);
    out.add(tempV3);

    value = Math.pow(t, 2);
    tempV3.set(point2).multiplyScalar(value);
    out.add(tempV3);
}

/**
 * 通过两个端点以及曲线上的一点确定二阶贝塞尔曲线的控制点。
 * 根据二阶贝塞尔曲线公式 pointInside = (1-t)²point1 + 2t(1-t)controlPoint + t²point2，
 * 可以得到controlPoint = (pointInside - (1-t)²point1 - t²point2)/2t(1-t);
 * @param point1 端点1
 * @param point2 端点2
 * @param pointInside { p: 曲线上点的坐标, t: 该点对应的插值点 }
 * @param out 输出
 */
function calcBezier2ControlPoint(point1: Vec3, point2: Vec3, pointInside: { p: Vec3, t: number }, out?: Vec3) {
    const controlPoint = out ?? new Vec3();
    controlPoint.set(Vec3.ZERO);
    const { p, t } = pointInside;

    tempV3.set(p);

    let value = Math.pow(1 - t, 2);
    tempV3_2.set(point1).multiplyScalar(value);
    tempV3.subtract(tempV3_2);

    value = Math.pow(t, 2);
    tempV3_2.set(point2).multiplyScalar(value);
    tempV3.subtract(tempV3_2);

    value = 2*t*(1-t);
    tempV3.multiplyScalar(1/value);

    controlPoint.set(tempV3);
    return controlPoint;
}

/**
 * 求两个向量组成的平面的法向量，遵循右手定则，dir1->dir2
 */
function calcNormal(dir1: Vec3, dir2: Vec3, out?: Vec3) {
    tempV3.set(dir1).normalize();
    tempV3_2.set(dir2).normalize();
    out = out ?? new Vec3();

    Vec3.cross(out, tempV3, tempV3_2);
    return out;
}

/**
 * 求平面中二维向量垂直的向量
 */
function vec2Normal(input: Readonly<Vec2>, out?: Vec2, antiClockwise?: boolean) {
    out = out ?? new Vec2();
    out.set(input.y, input.x);
    if (antiClockwise) {
        out.x = -out.x
    } else {
        out.y = -out.y;
    }
    return out;
}

type XYZ = { x: number, y: number, z: number };
type SizeLike = { length: number, width: number, height: number };

function vec3Set<T extends XYZ>(out: Vec3, from: T) {
    out.set(from.x, from.y, from.z);
    return out;
}

function xyzSet<TTarget extends XYZ, TFrom extends XYZ>(target: TTarget, from: TFrom) {
    target.x = from.x;
    target.y = from.y;
    target.z = from.z;
    return target;
}

function xyzAddSelf<TTarget extends XYZ, TFrom extends XYZ>(target: TTarget, other: TFrom) {
    target.x += other.x;
    target.y += other.y;
    target.z += other.z;
    return target;
}

function sizeSet<TTarget extends SizeLike, TFrom extends SizeLike>(target: TTarget, from: TFrom) {
    target.length = from.length;
    target.width = from.width;
    target.height = from.height;
    return target;
}

function rad2Degree(rad: number) {
    return rad/Math.PI*180;
}

function degree2Rad(degree: number) {
    return degree/180*Math.PI;
}

function distanceSqr<T1 extends XYZ, T2 extends XYZ>(a: T1, b: T2) {
    xyzSet(tempV3, a);
    xyzSet(tempV3_2, b);
    return Vec3.squaredDistance(tempV3, tempV3_2);
}

function distance<T1 extends XYZ, T2 extends XYZ>(a: T1, b: T2) {
    xyzSet(tempV3, a);
    xyzSet(tempV3_2, b);
    return Vec3.distance(tempV3, tempV3_2);
}

/** 消除向量在0附近的误差 */
function discardFloatingError(out: Vec3, epsilon?: number) {
    epsilon = epsilon ?? EPSILON;
    if (Math.abs(out.x) < epsilon)
        out.x = 0;
    if (Math.abs(out.y) < epsilon)
        out.y = 0;
    if (Math.abs(out.z) < epsilon)
        out.z = 0;
    return out;
}

export const gMath = {
    randomRangeInt,
    randomRange,
    clamp,
    almostEqual,
    moveTowards,
    vec3MoveTowards,
    vec3RotateTowards,
    bezier2,
    calcBezier2ControlPoint,
    calcNormal,
    vec2Normal,
    vec3Set,
    xyzSet,
    xyzAddSelf,
    sizeSet,
    rad2Degree,
    degree2Rad,
    distanceSqr,
    distance,
    discardFloatingError
}