import { clamp, Component, Constructor, error, game, js, lerp, tween, Tween, Vec2, _decorator } from "cc";
import { fgui } from "../base/base";
import { defer } from "../base/promise";
import { getOrAddComponent } from "../utils/util";
import { BaseComponent } from "./BaseComponent";
import { BaseWin } from "./BaseWin";
import { addTask } from "./TaskMgr";
import { DEBUG } from "cc/env";
import { MyEvent } from "fairygui-cc";
import { ViewBetween } from "./ViewBetween";

const { ccclass } = _decorator;
const enum kViewState {
    UnLoad,
    Loading,
    Loaded,
    Opened,
    Closed,
}

export function createViewCtrl(
    builder: import("./ViewMgr").ViewBuilder,
) {
    let layer = gFramework.layerMgr.getFLayer(builder.info.layer);
    let container: fgui.GComponent;
    container = new fgui.GComponent();
    container.opaque = false;
    container.touchable = true;
    container.makeFullContainer(layer.parent);
    container.addRelation(gFramework.layerMgr.fRoot, fgui.RelationType.Size);
    container.node.name = builder.info.className ?? builder.info.viewName;
    let ctrl = container.node.addComponent(ViewCtrl);
    ctrl.name = builder.ctrlKey;
    ctrl.openKey = builder.openKey;
    ctrl.ctrlKey = builder.ctrlKey;
    ctrl.info = builder.info;
    ctrl.widgets = builder.widgets;
    ctrl.sourceCtrlKey = builder.sourceCtrlKey;
    layer.addChildAt(container, builder.info.siblingIndex ?? layer.numChildren);
    return ctrl;
}

export const EventType = {
    open: "open",
    close: "close",
    loaded: "loaded",
    show: "show",
    hide: "hide"
};

@ccclass
export class ViewCtrl extends Component {
    static EventType = EventType;
    static TaskId: string = 'ViewCtrl';
    static FGUI_TASKID: number = 100;

    private static _taskSeqId: number = 0;
    static getTaskSeqId() {
        if (this._taskSeqId > 0xFFFE)
            this._taskSeqId = 0;
        return ++this._taskSeqId + this.FGUI_TASKID;
    }

    openKey: string;
    ctrlKey: string;
    fromKey?: string;

    info: IViewRegisterInfo;
    widgets: Constructor<BaseComponent>[];

    params: any;
    sourceCtrlKey: string;

    view: BaseWin;
    private _aview: Promise<BaseWin>;
    private _deferer: any;
    private _show: boolean = true;
    private _viewPos: Vec2;
    private _state: kViewState = kViewState.UnLoad;
    private _pkg: fgui.UIPackage = null;
    private _tween: Tween<ViewCtrl>;
    private _alphaEffect: number;
    get aview() {
        if (!!this._aview)
            return this._aview;
        return Promise.resolve(this.view);
    }

    get loaded() {
        return this._state === kViewState.Loaded || this._state === kViewState.Opened;
    }

    get closed() {
        return this._state === kViewState.Closed;
    }

    get className() {
        return this.info.className;
    }

    get border() {
        return this.info.border;
    }

    get lucency() {
        return this.info.lucency;
    }

    get maskIgnore() {
        return this.info.maskIgnore;
    }

    get layer() {
        return this.info.layer;
    }

    get clickout() {
        return this.info.clickout;
    }

    get mask() {
        let res = this.info.mask;
        if (res != undefined)
            return res;
        res = 0;
        if (this.loaded) {
            this.info.mask = res || 0.8;//策划修改
        }
        return res;
    }

    get sizeMode(): kUiSize {
        let res = this.info.sizeMode;
        if (res != undefined)
            return res;
        if (this.loaded) {
            this.info.sizeMode = kUiSize.normal;
            return kUiSize.normal;
        }
        return 0;
    }

    get isSpecial(): boolean {
        return this.info.special;
    }

    get alignMode() {
        return this.info.alignMode;
    }

    get tweenEffect() {
        return this.info.tweenEffect;
    }

    get afterEffect() {
        return this.info.afterEffect;
    }

    get fcom(): fgui.GComponent {
        return this.node && this.node["$gobj"];
    }

    get visible() {
        return this.fcom.visible && this.fcom.alpha > 0 && (!this.view || this.view.visible);
    }

    get alpha() {
        return this.fcom.alpha;
    }

    set alpha(value: number) {
        this.fcom.alpha = value;
    }

    get alphaEffect() {
        return this._alphaEffect;
    }

    set alphaEffect(value: number) {
        this._alphaEffect = value;
        let view = this.view;
        if (!view) return;
        view.fcom.alpha = Math.min(view.fcom.initAlpha, value);
        view.fcom.scaleX = view.fcom.scaleY = lerp(0.2, 1, value);
    }

    setVisible(value: boolean) {
        this.fcom.visible = value;
    }

    setViewPos(pos: Vec2) {
        this._viewPos = pos;
        if (this.loaded) {
            let view = this.view.fcom;
            view.setPosition(pos.x - view.width * 0.5, pos.y - view.height * 0.5);
        }
    }

    setParam(param: any) {
        if (param == undefined || param === null) {
            this.params = null;
            return;
        }
        if (this.info.paramMode === kUiParam.Collect) {
            if (this.params == null)
                this.params = [param];
            else
                this.params.push(param);
        }
        else {
            this.params = param;
        }
    }

    show() {
        if (this._show)
            return;

        this._show = true;
        this.fcom.touchable = true;

        this.alpha = 1;
        if (!!this.view) {
            this.node.emit(EventType.show, this);
        }
    }

    hide() {
        if (!this._show)
            return;

        this._show = false;
        this.fcom.touchable = false;

        this.alpha = 0;
        if (!!this.view) {
            this.node.emit(EventType.hide, this);
        }
    }

    isShow() { return this._show; }

    isClose() { return this._state === kViewState.Closed; }

    isViewOf(cls: Constructor<BaseWin>) {
        return this.openKey == js.getClassName(cls);
    }

    open(params?: any) {
        if (params != undefined) this.params = params;
        do {
            if (this._state === kViewState.Closed) {
                return this;
            }
            this.node.emit(EventType.open, this);
            if (DEBUG) {
                gFramework.log(`openUI  ${this.openKey}`, this.params == void 0 ? "" : this.params);
            }
            if (this._state === kViewState.Loading || this._state === kViewState.Loaded) {
                break;
            }
            if (this._state === kViewState.Opened) {
                this._open();
                break;
            }
            ViewBetween.ins.showLoading(1200);
            this._state = kViewState.Loading;
            this._deferer = defer();
            this._aview = this._deferer.promise;
            if (!this.info.packName) {
                this._onFguiLoaded();
            } else {
                gFramework.resMgr.loadFPkg(this.info.packName, (err, pkg) => {
                    if (err) {
                        error(err);
                        ViewBetween.ins.hideLoading();
                        return;
                    }

                    if (!this.isValid) {
                        ViewBetween.ins.hideLoading();
                        return;
                    }

                    if (this.isClose()) {
                        ViewBetween.ins.hideLoading();
                        return;
                    }
                    this._pkg = pkg = pkg.addRef();
                    this._onFguiLoaded();
                });
            }

        } while (false);
        return this;
    }

    close() {
        if (this._state === kViewState.Closed) {
            return;
        }
        const state = this._state;
        this._state = kViewState.Closed;
        this._show = false;
        if (this._tween) this._tween.stop();
        this.node.emit(EventType.hide, this);
        let view = this.view;
        if (view) {
            if (state === kViewState.Opened) {
                const onClose: (view: BaseWin) => void = this.params?.onClose;
                if (typeof onClose === 'function')
                    onClose.call(this, view);
                if (view.close)
                    view.close();
            }

            view.dispose(false);
            let comps = view.getComponentsInChildren(BaseComponent);
            for (let i = 0, il = comps.length, comp; i < il; i++) {
                comp = comps[i];
                if (comp !== view) {
                    comp.dispose(false);
                }
            }
            view.fcom.closeTask();
        }

        this.fcom.removeFromParent();
        this.node.emit(EventType.close, this);
        gFramework.soundPlayer.playUISound("sound_close");
        addTask(ViewCtrl.TaskId, (task) => {
            if (this.isValid) {
                this.fcom.dispose();
                this._pkg?.decRef();
            }
            task.done();
        });
        if (DEBUG) {
            gFramework.log(`closeUI  ${this.openKey}`);
        }
    }

    private _ktweeningCtrkey: { [key: string]: boolean } = {};
    private _onFguiLoaded() {
        if (this._state === kViewState.Closed) return;
        if (!this.view) {
            addTask(ViewCtrl.TaskId, (task) => {
                if (this._state !== kViewState.Closed) {
                    this._createView(this._createFgui());
                }
                this._state = kViewState.Loaded;
                task.done();
            });
        }

        addTask(ViewCtrl.TaskId, (task) => {
            if (this._state !== kViewState.Closed) {
                this._initView();
                if (this._show && this.tweenEffect) {
                    this.view.fcom.alpha = 0;
                    this.view.fcom.scaleX = this.view.fcom.scaleY = 0;
                    this._alphaEffect = 0;
                }
                this._addChild();
                ///////////////////////
                this.node.emit(EventType.loaded, this);
                ///////////////////////
                if (isNaN(this.alphaEffect)) {
                    this.node.emit(MyEvent.WINTWEENEND, this);
                    gFramework.viewMgr.setTweening(false);
                    ViewBetween.ins.hideLoading();
                } else {
                    this._ktweeningCtrkey[this.view.ctrlKey] = true;
                    gFramework.viewMgr.setTweening(true);
                    this._tween = tween<ViewCtrl>(this)
                        .to(0.22, { alphaEffect: 1 }, { easing: "sineOut" }).call(() => {
                            this._tween = null;
                            delete this._ktweeningCtrkey[this.view.ctrlKey];
                            gFramework.viewMgr.setTweening(false);
                            this.node.emit(MyEvent.WINTWEENEND, this);
                            ViewBetween.ins.hideLoading();
                        })
                        .start();
                }
                this._resolveView();
                this.scheduleOnce(() => {
                    this._state = kViewState.Opened;
                    try {
                        this._open();
                    } catch (err) { error(err); }
                }, 0.01);
            }
            task.done();
        });
    }

    private _resolveView() {
        this._deferer.resolve(this.view);
        this._deferer = null;
        this._aview = null;
    }

    checkIsCtrTweening() {
        return !!this._ktweeningCtrkey[this.ctrlKey];
    }

    checkIsTweenEnd() {

    }

    private _createFgui() {
        let fcom: fgui.GComponent;
        if (!this.info.packName)
            fcom = new fgui.GComponent();
        else
            fcom = fgui.UIPackage.createObject(
                this.info.packName,
                this.info.viewName
            ).asCom;
        fcom.opaque = false;
        fcom.setPivot(0.5, 0.5);
        return fcom;
    }

    private _createView(fgui: fgui.GComponent) {
        let openKey = this.openKey,
            info = this.info;
        let view: BaseWin;
        view = fgui.node.addComponent(info.clazz);
        view.openKey = openKey;
        view.ctrlKey = this.ctrlKey;
        view.fromKey = this.fromKey;
        this.view = view;
    }

    private _initView() {
        let view: BaseWin,
            widgets = this.widgets,
            info = this.info;
        view = this.view;
        view.initProp(view, info.clazz);
        if (widgets) {
            for (let i = 0, il = widgets.length, comp; i < il; i++) {
                comp = getOrAddComponent(view, widgets[i]);
                view.initProp(comp, widgets[i]);
            }
        }
    }

    private _addChild() {
        this.fcom.addChild(this.view.fcom);
        gFramework.layerMgr.on("Resize", this._adapt, this);
        this._adapt();
    }

    private _open() {
        let view = this.view;
        if (this._state !== kViewState.Opened) {
            let loadFn = view.delayOnLoad;
            if (typeof loadFn === "function")
                loadFn.call(view);
        }

        let openFn = view.open,
            params = this.params,
            onOpenFn: (view: BaseWin) => void = params?.onOpen;
        if (typeof openFn === "function") {
            openFn.call(view, params);
        }
        if (typeof onOpenFn === 'function')
            onOpenFn.call(null, view);
    }

    private _adapt() {
        let parent = this.fcom;
        let view = this.view.fcom;
        if (this.border || this.sizeMode === kUiSize.full || this.sizeMode === kUiSize.mixFull) {
            view.makeFullContainer(parent);
            view.setPosition(0, 0);
            view.addRelation(parent, fgui.RelationType.Size);
        } else {
            switch (this.alignMode) {
                case kUiAlign.leftCenter:
                    view.setPosition(0, (parent.height - view.height) / 2);
                    view.addRelation(parent, fgui.RelationType.Left_Left);
                    view.addRelation(parent, fgui.RelationType.Middle_Middle);
                    break;
                default:
                    let x: number, y: number;
                    if (this._viewPos) {
                        x = this._viewPos.x;
                        y = this._viewPos.y;
                    } else {
                        x = parent.width * 0.5;
                        y = parent.height * 0.5;
                    }
                    view.setPosition(x - view.width * 0.5, (y - view.height * 0.5) - (gFramework.layerMgr.offsetSize >> 1));
                    view.addRelation(parent, fgui.RelationType.Center_Center);
                    view.addRelation(parent, fgui.RelationType.Middle_Middle);

                    let scalex = Math.min(parent.width / view.width, 1);
                    let scaley = Math.min(parent.height / view.height, 1);
                    let scale = Math.min(scalex, scaley);
                    view.setScale(scale, scale);
                    break;
            }
        }
    }
}
