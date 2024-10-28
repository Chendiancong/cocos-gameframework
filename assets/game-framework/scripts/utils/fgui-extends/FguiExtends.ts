import { Component, Node, Vec2 } from "cc";
import { GList, GMovieClip, GObject, GRoot, Transition, UBBParser, UIConfig } from "fairygui-cc";
import { PoolManager } from "game-framework/scripts/base/ObjectPool";
import { applyMixins } from "game-framework/scripts/base/jsUtil";
import { defer } from "game-framework/scripts/base/promise";
import { PooledVec3 } from "../math/PooledCCValues";

class TransitionExtends implements FguiExtends.TransitionExtends {
    xPlay(this: Transition, onComplete?: () => void, times?: number, delay?: number, startTime?: number, endTime?: number): Promise<Transition> {
        const d = defer<Transition>();
        this.play(
            () => {
                onComplete && onComplete();
                d.resolve(this);
            },
            times, delay, startTime, endTime
        )
        return d.promise;
    }
}

applyMixins(Transition, [TransitionExtends]);

class MovieClipExtends implements FguiExtends.GMovieClipExtends {
    xShowAndPlay(this: GMovieClip, playTimes: number): Promise<GMovieClip> {
        const d = defer<GMovieClip>();
        this.visible = true;
        this.playing = true;
        this.setPlaySettings(0, -1, playTimes, 0, () => {
            d.resolve(this);
            this.visible = false;
            this.playing = false;
        });
        return d.promise;
    }
}

applyMixins(GMovieClip, [MovieClipExtends]);

class GObjectExtends implements FguiExtends.GObjectExtends {
    xLocalToGlobal(this: GObject, ax?: number, ay?: number, result?: Vec2): Vec2 {
        ax = ax || 0;
        ay = ay || 0;
        const v3 = PoolManager.getItem(PooledVec3);
        v3.x = ax;
        v3.y = -ay;
        if (!this._pivotAsAnchor) {
            v3.x -= this._uiTrans.anchorX * this._width;
            v3.y += (1 - this._uiTrans.anchorY) * this._height;
        }
        this._uiTrans.convertToWorldSpaceAR(v3, v3);
        {
            // worldPosition基于设计坐标系，所以先从设计坐标转换为全屏坐标
            const {
                width: realWidth, height: realHeight
            } = GRoot.inst;
            const {
                designWidth, designHeight
            } = UIConfig;
            v3.x -= (realWidth - designWidth) >> 1;
            v3.y += (realHeight - designHeight) >> 1;
            v3.y = realHeight - v3.y;
        }
        result = result || new Vec2();
        result.x = v3.x;
        result.y = v3.y;
        PoolManager.pushItem(v3);
        return result;
    }

    xGlobalToLocal(this: GObject, ax?: number, ay?: number, result?: Vec2): Vec2 {
        ax = ax || 0;
        ay = ay || 0;
        const v3 = PoolManager.getItem(PooledVec3);
        v3.x = ax;
        v3.y = ay;
        {
            // worldPosition基于设计坐标系，所以先从全屏坐标系转换为设计坐标系
            const {
                width: realWidth, height: realHeight
            } = GRoot.inst;
            const {
                designWidth, designHeight
            } = UIConfig;
            v3.x += (realWidth - designWidth) >> 1;
            v3.y = realHeight - v3.y;
            v3.y -= (realHeight - designHeight) >> 1;
        }
        this._uiTrans.convertToNodeSpaceAR(v3, v3);
        result = result || new Vec2();
        result.x = v3.x;
        result.y = -v3.y;
        PoolManager.pushItem(v3);
        return result;
    }
}

applyMixins(GObject, [GObjectExtends]);

class GListExtends implements FguiExtends.GListExtends {
    emitToItems(this: GList, ...args: Parameters<Node['emit']>): void {
        for (const c of this._children)
            c.node.emit(...args);
    }
}

applyMixins(GList, [GListExtends]);

(function fixUBBParser() {
    // const originParse = UBBParser.prototype.parse;
    // UBBParser.prototype.parse = new Proxy(
    //     originParse,
    //     {
    //         apply(target, thiz, argArray) {
    //             // 去除最后一个参数的影响，使得普通的GTextField也支持ubb语法
    //             if (argArray.length > 1)
    //                 argArray.pop();
    //             return target.call(thiz, ...argArray);
    //         }
    //     }
    // );
})();