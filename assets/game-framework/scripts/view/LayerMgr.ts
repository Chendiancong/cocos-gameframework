import { _decorator, EventTarget, screen, lerp, director, Node, Vec2, UITransform, Vec3, Camera, Rect } from 'cc';
import { WECHAT } from 'cc/env';
import * as fgui from 'fairygui-cc';
import { gMath } from '../utils/math/MathUtil';
import { PoolManager } from '../base/ObjectPool';
import { PooledVec3 } from '../utils/math/PooledCCValues';
import { IGameInstance } from '../base/BaseGameInstance';
const { ccclass } = _decorator;

export enum UILayer {
    /** 根层，该层不应该被使用 */
    UI_Root,
    /** 低层 */
    UI_Low,
    /** 世界UI */
    UI_World,
    /** 主界面 */
    UI_Main,
    /** Low窗口层 */
    UI_PopWindow_Low,
    /** 默认窗口层 */
    UI_PopWindow,
    /** Top窗口层 */
    UI_PopWindow_Top,
    /** 引导层 */
    UI_Guide,
    /** 弹窗界面 */
    UI_Dialog,
    /** Tip层，该层需要点击事件 */
    UI_Tips,
    /** tips or 飘字层，该层无点击事件 */
    UI_PopTips,

    /** 加载 */
    UI_Loading,
    /** 系统公告 */
    UI_Sys,
    /** 阻挡层 */
    UI_Modal,
    /** 顶层 */
    UI_Top
}

const minScreenRatio = 16 / 9;
const maxScreenRatio = 2 / 1;
const minBorderSize = 0;
const maxBorderSize = 50;
const v2 = new Vec2();

/**
 * 层级对象
 */
export class FGUILayerNode extends fgui.GComponent {
    protected get observeWhenEnable() { return false; }
    constructor(public layer: UILayer) {
        super();
        this.opaque = false;
        this.touchable = true;
        this.makeFullScreen();
    }
}


@ccclass('LayerMgr')
export class LayerMgr extends EventTarget {
    fRoot: fgui.GRoot = null;
    mainUI: fgui.GComponent = null;
    mainLayer: FGUILayerNode = null;
    private _fguiLayers: FGUILayerNode[] = [];
    private _borderSize: number = 0;
    private _orientation: "landscape" | "portrait" = "landscape";

    init({ uiRootNode: rootNode }: IGameInstance) {
        rootNode = rootNode ?? director.getScene().getChildByName('Canvas') ?? director.getScene();
        this.fRoot = fgui.GRoot.create(rootNode);
        this.mainLayer = new FGUILayerNode(UILayer.UI_Root);
        this.mainLayer.node.name = UILayer[UILayer.UI_Root];
        this.fRoot.addChild(this.mainLayer);
        this.mainLayer.addRelation(this.fRoot, fgui.RelationType.Size);

        for (let i = UILayer.UI_Low; i <= UILayer.UI_Top; ++i) {
            const layer = this._fguiLayers[i] = new FGUILayerNode(i);
            layer.node.name = UILayer[i] ?? 'GComponent';
            this.mainLayer.addChild(layer);
            layer.makeFullContainer(this.mainLayer);
            layer.addRelation(this.mainLayer, fgui.RelationType.Size);
        }

        this._wechatCompatible();
        this._onWindowResize();
        this.adapt();
    }

    private onSafeArea() {
        this.adapt();
    }

    private _onWindowResize() {
        const winSize = screen.windowSize;
        if (winSize.width >= winSize.height)
            this._orientation = "landscape";
        else
            this._orientation = "portrait";
        this._layerAdapt();
    }

    private adapt() {
        const winSize = screen.windowSize;
        const long = Math.max(winSize.width, winSize.height);
        const short = Math.min(winSize.width, winSize.height);
        let ratio = gMath.clamp(long / short, minScreenRatio, maxScreenRatio);
        ratio = (ratio - minScreenRatio) / (maxScreenRatio - minScreenRatio);
        this._borderSize = lerp(minBorderSize, maxBorderSize, ratio);
        this._layerAdapt();
        this.emit("Resize");
    }

    private _layerAdapt() {
        fgui.DragDropManager.inst.offYSize = this.offsetSize;
        if (!!this.mainLayer) {
            this.mainLayer.y = this.offsetSize;
            this.mainLayer.height = this.fRoot.height - this.offsetSize;
        }
    }

    private _wxMenuButtonTop: number = 0;//50;
    private _wechatCompatible() {
        if (!WECHAT)
            return;
        const ratio = this.fRoot.height / wx.getSystemInfoSync().screenHeight;
        const bound = wx.getMenuButtonBoundingClientRect();
        this._wxMenuButtonTop = bound.top * ratio - 20;//todo
    }

    public getWXMenuButtonTop() {
        return this._wxMenuButtonTop;
    }

    getFInputProcessor() {
        return this.fRoot.inputProcessor;
    }

    getOrientation() {
        return this._orientation;
    }

    getBorderSize() {
        return this._borderSize;
    }

    /** 界面整体下移值 */
    get offsetSize() {
        return Math.max(this._borderSize, this._wxMenuButtonTop);
    }

    getFLayer(layer: UILayer) {
        return this._fguiLayers[layer];
    }

    /**
     * 获取GObject以屏幕左上角为原点，以向右向下为正方向的包围盒
     */
    getBoundingBox(felem: fgui.GComponent | fgui.GObject): { leftX: number, topY: number, width: number, height: number } {
        const box = Object.create(null);
        const {
            width, height,
            pivotAsAnchor,
            pivotX, pivotY,
            scaleX, scaleY
        } = felem;
        let x = 0, y = 0;
        if (pivotAsAnchor) {
            x -= width * pivotX;
            y -= height * pivotY;
        }

        felem.localToGlobal(x, y, v2);
        // ui的设置是水平居中显示，水平不会拉伸，它的宽度恒定为设计分辨率的宽度(当前为750)，两边容许黑边，为了同时适配宽屏，需要将x坐标进行一定的转化
        // box.leftX = v2.x;
        box.leftX = Math.max(0, this.fRoot.width - fgui.UIConfig.designWidth) / 2 + v2.x;
        box.topY = v2.y;
        box.width = width * scaleX;
        box.height = height * scaleY;

        return box;
    }

    /** 世界坐标转换为fgui本地坐标 */
    worldToUIPos(fcontainer: fgui.GObject, wCamera: Camera, wPos: Readonly<Vec3>, out?: Vec2) {
        const converted = PoolManager.getItem(PooledVec3);
        wCamera.convertToUINode(wPos, fcontainer.node, converted);
        out = out ?? new Vec2();
        out.set(converted.x, converted.y);
        this.nodePosToUIPos(fcontainer, out, out);
        PoolManager.pushItem(converted);
        return out;
    }

    /** uinode坐标转换为fgui本地坐标 */
    nodePosToUIPos(fcontainer: fgui.GObject, nodePos: Readonly<Vec2>, out?: Vec2) {
        out = out ?? new Vec2();
        let {
            x, y
        } = nodePos;
        const {
            width, height,
            pivotAsAnchor,
            pivotX, pivotY
        } = fcontainer;
        const node = fcontainer.node;
        const uiTrans = node.getComponent(UITransform);
        let pivotDiffX: number,
            pivotDiffY: number;
        if (pivotAsAnchor) {
            pivotDiffX = (uiTrans?.anchorX ?? 0.5) - pivotX;
            pivotDiffY = (uiTrans?.anchorY ?? 0.5) - pivotY;
        } else {
            // 左上角
            pivotDiffX = (uiTrans?.anchorX ?? 0.5) - 0;
            pivotDiffY = (uiTrans?.anchorY ?? 0.5) - 1;
        }
        x += width * pivotDiffX;
        y += height * pivotDiffY + this.getBorderSize();
        // 上下倒转
        y = -y;
        out.set(x, y);
        return out;
    }

    /** fgui全局坐标转换为实际屏幕坐标，左上角为原点 */
    globalPosToScreenPos(gpos: Readonly<Vec2>, out?: Vec2) {
        const {
            windowSize: { width: screenWidth, height: screenHeight }
        } = screen;
        const {
            width: fWidth, height: fHeight
        } = fgui.GRoot.inst;
        out = out ?? new Vec2();
        out.set(
            gpos.x / fWidth * screenWidth,
            gpos.y / fHeight * screenHeight
        );
        // ---同样效果，使用cc.view---
        // out.set(gpos.x * view.getScaleX(), gpos.y * view.getScaleY());
        // -------------
        return out;
    }

    /** 计算ui对象的包围盒 */
    uiRect(fobj: fgui.GObject, rect?: Rect) {
        rect = rect ?? new Rect();
        const pivotAsAnchor = fobj.pivotAsAnchor;
        rect.xMin = fobj.x;
        rect.yMin = fobj.y;
        if (pivotAsAnchor) {
            rect.xMin -= fobj.width * fobj.pivotX;
            rect.yMin -= fobj.height * fobj.pivotY;
        }
        rect.xMax = rect.xMin + fobj.width;
        rect.yMax = rect.yMin + fobj.height;
        return rect;
    }
}