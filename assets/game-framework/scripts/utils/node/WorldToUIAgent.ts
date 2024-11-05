import { Component, Prefab, UITransform, Vec3, instantiate } from "cc";
import { IWorldToUITrackable, WorldToUITracker } from "./WorldToUITracker";
import { Node } from "cc";
import { getOrAddComponent } from "../util";
import { ResKeeper } from "game-framework/scripts/res/ResKeeper";
import { GComponent, GObject } from "fairygui-cc";
import { BaseComponent } from "game-framework/scripts/view/BaseComponent";

export interface IWorldToUIAgentOption {
    /** 唯一id */
    readonly agentUuid: string,
    /** 3d实体的坐标 */
    readonly entityWorldPos: Readonly<Vec3>,
    /** ui节点容器 */
    readonly uiContainer: Node,
    /** 世界坐标映射器 */
    readonly tracker: WorldToUITracker;
    /** 设置ui坐标 */
    onSetUIPos(agent: WorldToUIAgent, ...args: Parameters<IWorldToUITrackable['setWorldToUIPos']>): void,
    /** 设置ui缩放 */
    onSetUIScale(agent: WorldToUIAgent, ...args: Parameters<IWorldToUITrackable['setWorldToUIScale']>): void,
    /** agent被销毁时 */
    onAgentDestroy(agent: WorldToUIAgent): void;
}

export class WorldToUIAgent implements IWorldToUITrackable {
    protected _option: IWorldToUIAgentOption;
    protected _rootUINode: Node;
    protected _url: string;
    protected _isDestroyed: boolean;
    protected _curContainer: Node
    protected _curTracker: WorldToUITracker;
    protected _hudNode: Node;
    protected _hudTransform: UITransform;

    get uuid() { return this._option.agentUuid; }
    get entityWorldPos() { return this._option.entityWorldPos; }
    get uiContainer() { return this._option.uiContainer; }
    get rootUINode() { return this._rootUINode; }
    get hudNode() { return this._hudNode; }
    get hudTransform() { return this._hudTransform; }

    constructor(option: IWorldToUIAgentOption) {
        this._option = option;

        gFramework.assert(option.uiContainer?.isValid && option.tracker?.isValid);
        this.internalCtor(option);
    }

    async createNode<T extends Component = undefined>(url: string, compCtor?: Constructor<T>) {
        if (this._isDestroyed)
            return;
        if (this._url !== url || !this._hudNode?.isValid) {
            this._url = url;
            const prefab = await gFramework.resMgr.aloadRes<Prefab>(url);
            if (this._url !== url || this._isDestroyed) {
                prefab.decRef();
                return;
            }
            if (this._hudNode?.isValid) {
                this._hudNode.destroy();
                this._hudNode = void 0;
            }
            const node = this._hudNode = instantiate(prefab);
            this._hudTransform = getOrAddComponent(node, UITransform);
            ResKeeper.register(node, prefab);
            node.parent = this._rootUINode;
        }

        this.detach();
        this._rootUINode.parent = this._option.uiContainer;
        this._option.tracker.register(this);
        this._curContainer = this._option.uiContainer;
        this._curTracker = this._option.tracker;

        if (compCtor)
            return getOrAddComponent(this._hudNode, compCtor);
        else
            return; 
    }

    switchHudNode(hudNode: Node) {
        if (this._isDestroyed)
            return;

        if (this._hudNode?.isValid) {
            this._hudNode.destroy();
            this._hudNode = void 0;
        }
        hudNode.parent = this._rootUINode;
        this._hudTransform = getOrAddComponent(hudNode, UITransform);
        this._hudNode = hudNode;
        this.detach();
        this._rootUINode.parent = this._option.uiContainer;
        this._option.tracker.register(this);
        this._curContainer = this._option.uiContainer;
        this._curTracker = this._option.tracker;
    }

    setWorldToUIPos(pos: Readonly<Vec3>) {
        this._option.onSetUIPos(this, pos);
    }

    setWorldToUIScale(scale: number) {
        this._option.onSetUIScale(this, scale);
    }

    detach() {
        if (this._curContainer?.isValid) {
            this._rootUINode.parent = void 0;
            delete this._curContainer;
        }
        if (this._curTracker?.isValid) {
            this._curTracker.unregister(this);
            delete this._curTracker;
        }
    }

    destroy() {
        this._isDestroyed = true;
        this._option.onAgentDestroy.call(this._option, this);
        this.detach();
        if (this._rootUINode?.isValid)
            this._rootUINode.destroy();
    }

    protected internalCtor(option: IWorldToUIAgentOption) {
        this._rootUINode = new Node(`$WorldToUIAgent_${this.uuid}`);
    }
}

export class FguiWorldToUIAgent extends WorldToUIAgent {
    private _gcomp: GComponent;
    private _hudGComp: GComponent;
    private _packName: string;
    private _viewName: string;

    get gcomp() { return this._gcomp; }
    get hudGComp() { return this._hudGComp; }

    /**
     * @deprecated
     * use createFgui instead
     */
    async createNode<T extends Component = undefined>(url: string, compCtor?: Constructor<T>): Promise<T> {
        throw new Error('use createFgui instead');
    }

    /**
     * @deprecated
     * use switchFguiHud insteand
     */
    switchHudNode(hudNode: Node): void {
        throw new Error('use switchFguiHud instead')
    }

    async createFgui<T extends ViewDef.ViewComp>(packName: string, viewName: string, ctor: Constructor<T>): Promise<T|void> {
        if (this._isDestroyed)
            return;

        if (this._packName !== packName || this._viewName !== viewName || !this._hudGComp?.isDisposed) {
            this._packName = packName;
            this._viewName = viewName;
            const fpkg = await gFramework.resMgr.aloadFPkg(packName);
            if (this._packName !== packName || this._viewName !== viewName || this._isDestroyed) {
                fpkg.decRef();
                return;
            }
            if (this._hudGComp) {
                this._hudGComp.dispose();
                this._hudGComp = void 0;
                this._hudNode = void 0;
            }
            const comp = gFramework.viewMgr.createComponent(ctor, packName, viewName);
            this._hudTransform = getOrAddComponent(comp.node, UITransform);
            ResKeeper.register(comp.node, fpkg);
            this._gcomp.addChild(comp.fobj);
        }

    }

    protected internalCtor(option: IWorldToUIAgentOption) {
        this._gcomp = new GComponent();
        this._rootUINode = this._gcomp.node;
        this._rootUINode.name = `$WorldToUIAgent_${this.uuid}`;
    }
}