import { Rect, Vec2, Vec3, Vec4, geometry } from "cc";
import { mixinPoolItem } from "game-framework/scripts/base/ObjectPool";

export interface PooledVec2 extends gFramework.IPoolItem {}
@mixinPoolItem
export class PooledVec2 extends Vec2 {}

export interface PooledVec3 extends gFramework.IPoolItem {}
@mixinPoolItem
export class PooledVec3 extends Vec3 {}

export interface PooledVec4 extends gFramework.IPoolItem {}
@mixinPoolItem
export class PooledVec4 extends Vec4 {}

export interface PooledRay extends gFramework.IPoolItem {}
@mixinPoolItem
export class PooledRay extends geometry.Ray {}

export interface PooledRect extends gFramework.IPoolItem {}
@mixinPoolItem
export class PooledRect extends Rect { }

export interface PooledAABBBox extends gFramework.IPoolItem {}
@mixinPoolItem
export class PooledAABBBox extends geometry.AABB { }