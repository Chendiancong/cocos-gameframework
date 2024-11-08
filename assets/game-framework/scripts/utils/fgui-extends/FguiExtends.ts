import { Node, Vec2, view } from "cc";
import { GComponent, GList, GLoader, GMovieClip, GObject, GRoot, Transition, UIPackage } from "fairygui-cc";
import { PoolManager } from "game-framework/scripts/base/ObjectPool";
import { applyMixins } from "game-framework/scripts/base/jsUtil";
import { defer } from "game-framework/scripts/base/promise";
import { PooledVec3 } from "../math/PooledCCValues";
import type { BaseComponent } from "game-framework/scripts/view/BaseComponent";
import { getOrAddComponent } from "../util";

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
    private _ccRenderClazz: Constructor<BaseComponent>;
    private _ccRender: BaseComponent;
    private _extraRenders: BaseComponent[] = [];

    get ccRenderClazz(): GObjectExtends['_ccRenderClazz'] { return this._ccRenderClazz; }
    set ccRenderClazz(val: GObjectExtends['_ccRenderClazz']) {
        if (this._ccRenderClazz === val)
            return;
        if (this._ccRender?.isValid)
            this._ccRender.dispose(false);
        this._ccRenderClazz = val;
        this._ccRender = this._internalAddRenderer(val, null, false);
    }

    get ccRender() { return this._ccRender; }

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
                width: designWidth,
                height: designHeight
            } = view.getDesignResolutionSize();
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
                width: designWidth,
                height: designHeight
            } = view.getDesignResolutionSize();
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

    addRenderer(clazz: Constructor<BaseComponent>, params?: Record<string, any>) {
        this._internalAddRenderer(clazz, params, true);
    }

    makeFullScreen(this: GObject): void {
        const {
            width, height
        } = GRoot.inst;
        this.setSize(width, height);
    }

    makeFullWithTarget(this: GObject, target: GObject): void {
        this.setSize(target.width, target.height);
    }

    private _internalAddRenderer(val: this['ccRenderClazz'], params?: { [x: string]: any }, isExtra?: boolean) {
        if (!val)
            return;
        const ccRender = getOrAddComponent((this as any as GObject).node, val);
        if (!!params)
            Object.assign(ccRender, params);
        ccRender.initProp();
        if (isExtra)
            this._extraRenders.push(ccRender);
        return ccRender;
    }
}

applyMixins(GObject, [GObjectExtends]);

class GListExtends implements FguiExtends.GListExtends {
    protected _ccItemRenderer: Constructor<FguiExtends.FguiComponent>;

    get ccItemRenderClazz() { return this._ccItemRenderer; }
    set ccItemRenderClazz(val: Constructor<FguiExtends.FguiComponent>) {
        this._ccItemRenderer = val;

        const list = this as any as GList;
        let _child: GObject,
            _children = list._children;
        for (let i = 0, len = _children.length; i < len; ++i) {
            _child = _children[i];
            _child.ccRenderClazz = val;
        }
    }

    emitToItems(...args: Parameters<Node['emit']>): void {
        const list = this as any as GList;
        for (const c of list._children)
            c.node.emit(...args);
    }
}

applyMixins(GList, [GListExtends]);

class GComponentExtends implements FguiExtends.GComponentExtends {
    get isJobConstruct() { return false; }

    getChildByNames(names: string[]): GObject {
        let gcom = this as any as GComponent;
        let obj: GObject;

        for (let i = 0, len = names.length; i < len; ++i) {
            obj = gcom.getChild(names[i]);
            if (!obj)
                break;
            if (i != len - 1) {
                if (!(obj instanceof GComponent)) {
                    obj = null;
                    break;
                }
                gcom = obj;
            }
        }

        return obj;
    }

    addAsyncComponentRenderer(clazz: Constructor<BaseComponent>, params?: Record<string, any>) {
        (this as any as GComponent).addRenderer(clazz, params);
    }
}

applyMixins(GComponent, [GComponentExtends]);

class GLoaderExtends implements FguiExtends.GLoaderExtends {
    private _contentRenderers: { clazz: Constructor<BaseComponent>, params?: Record<string, any> }[] = [];

    addContentRenderClazz(clazz: Constructor<BaseComponent>, params?: Record<string, any>) {
        const renderers = this._contentRenderers;
        renderers.push({ clazz, params });
        if (!!this['_content2'])
            return (this['_content2'] as GObject).addRenderer(clazz, params);
    }

    removeContentRenderClazzes(targetClazzs?: Constructor<FguiExtends.FguiComponent>[]): void {
        const loader = this as any as GLoader;
        const renderers = this._contentRenderers;
        function filter(clazz: Constructor<FguiExtends.FguiComponent>) {
            if (!targetClazzs)
                return true;
            return targetClazzs.includes(clazz);
        }
        if (renderers.length) {
            for (const r of renderers) {
                if (filter(r.clazz))
                    loader.node.getComponentsInChildren(r.clazz);
            }
            this._contentRenderers.length = 0;
        }
        if (!!this['_content2'])
            (this['_content2'] as GObject).ccRenderClazz = null;
    }
}

applyMixins(GLoader, [GLoaderExtends]);

class UIPackageExtends implements FguiExtends.UIPackageExtends {
    private _ref: number;

    addRef() {
        const curRef = this._ref ?? 0;
        this._ref = curRef + 1;
        return this as any as UIPackage;
    }

    decRef() {
        const pkg = this as any as UIPackage;
        const curRef = this._ref ?? 0;
        this._ref = Math.max(0, curRef - 1);
        if (this._ref > 0)
            return pkg;
        do {
            if (!UIPackage.getByName(pkg.name))
                break;
            UIPackage.removePackage(pkg.name);
        } while (false);
        return pkg;
    }
}

applyMixins(UIPackage, [UIPackageExtends]);

// (function fixUBBParser() {
//     const originParse = UBBParser.prototype.parse;
//     UBBParser.prototype.parse = new Proxy(
//         originParse,
//         {
//             apply(target, thiz, argArray) {
//                 // 去除最后一个参数的影响，使得普通的GTextField也支持ubb语法
//                 if (argArray.length > 1)
//                     argArray.pop();
//                 return target.call(thiz, ...argArray);
//             }
//         }
//     );
// })();