import { Asset, Component, game, Node, _decorator } from "cc";
import { UIPackage } from "fairygui-cc";
import { ObjectPool } from "../base/ObjectPool";
import { getOrAddComponent } from "../utils/util";
import { ResExpireType, ResInfo, ResInfoComponent } from "./ResInfo";
import { ResReleaser } from "./ResReleaser";

const { ccclass, property } = _decorator;

type GameResType = Asset|UIPackage;

@ccclass("ResKeeper")
export class ResKeeper extends Component {
    private _resRef = new ResManageable();

    setRes<T extends GameResType>(res: T) {
        if (this._resRef.isSameRes(res))
            return;
        this._releaseRes();
        this._resRef.res = res;
        this._whenSetRes();
    }

    getRes<T extends GameResType>() {
        return <T>this._resRef.res;
    }

    setupResInfo(resInfo?: ResInfo): void;
    setupResInfo(resInfoComp?: ResInfoComponent): void;
    setupResInfo(...[infoOrComp]: any[]): void {
        if (infoOrComp instanceof ResInfoComponent)
            this._resRef.info.copyFrom(infoOrComp.info);
        else
            this._resRef.info.copyFrom(infoOrComp??ResInfo.normal);
    }

    onDestroy() {
        this._releaseRes();
    }

    /**
     * 标记一个节点的资源引用，在该节点被摧毁的时候减少资源的引用次数
     * @param node 关联节点
     * @param res 引用的资源
     * @param keeper 如果希望替换之前已经标记了的资源，那么应该传入对应的ResKeeper
     */
    static register(node: Node, res: GameResType, keeper?: ResKeeper): ResKeeper|null {
        const resInfoComp = node.getComponent(ResInfoComponent);
        if (resInfoComp?.info.expireType != ResExpireType.Forever) {
            const resKeeper = keeper??node.addComponent(ResKeeper);
            resKeeper.setupResInfo(resInfoComp);
            resKeeper.setRes(res);
            return resKeeper;
        } else
            return null;
    }

    /**
     * 通过特定key标记一个节点的资源引用，在该节点被摧毁的时候减少资源的引用
     * @param node 关联节点
     * @param res 引用的资源
     * @param key 标记的key，如果希望单个节点能够互斥地标记某一类资源，则这一类资源应该具备同样的key
     */
    static registerWithKey(node: Node, res: GameResType, key: string) {
        const resInfoComp = node.getComponent(ResInfoComponent);
        if (resInfoComp?.info.expireType != ResExpireType.Forever) {
            const keeperKey = `$resKeeper_${key}`;
            let resKeeper = node[`$resKeeper_${key}`] as ResKeeper;
            if (!resKeeper?.isValid)
                resKeeper = node[`$resKeeper_${key}`] = node.addComponent(ResKeeper);
            resKeeper.setRes(res);
            return resKeeper;
        } else
            return null;
    }

    private _whenSetRes() {
        const resRef = this._resRef;
        if (ResManageable.isValid(resRef)) {
            switch (resRef.info.expireType) {
                case ResExpireType.Forever:
                    break;
                case ResExpireType.UnuseTime:
                    resRef.addRef();
                    ResReleaser.ins.del(resRef);
                    break;
                case ResExpireType.Normal:
                default:
                    resRef.addRef();
            }
        }
    }

    private _releaseRes() {
        const resRef = this._resRef;
        if (ResManageable.isValid(resRef)) {
            switch (resRef.info.expireType) {
                case ResExpireType.Forever:
                    break;
                case ResExpireType.UnuseTime:
                    resRef.endTimeMs = game.totalTime+resRef.info.expireSec*1000;
                    ResReleaser.ins.add(resRef);
                    resRef.decRef();
                    break;
                case ResExpireType.Normal:
                default:
                    resRef.decRef();
            }
            resRef.res = null;
        }
    }
}

export class ResManageable implements gFramework.IPoolItem {
    static readonly pool = ObjectPool.create({
        ctor: () => new ResManageable(),
    })

    res: GameResType;
    info: ResInfo = new ResInfo();;
    endTimeMs: number = 0;
    private _manageRefCount: number = 0;

    get manageRefCount() {
        return this._manageRefCount;
    }

    get uuid() {
        return ResManageable.getUuidOfRes(this.res);
    }

    get isValid() {
        const res = this.res as any;
        return res && (res.isValid || res.refCount>0);
    }

    addRef() {
        if (++this._manageRefCount == 1)
            this.res?.addRef();
    }

    decRef() {
        this._manageRefCount = Math.max(0, this._manageRefCount-1);
        if (this._manageRefCount == 0)
            this.res?.decRef();
    }

    isSameRes(res: GameResType) {
        const uuid = this.uuid;
        const otherUuid = ResManageable.getUuidOfRes(res);
        return uuid == otherUuid;
    }

    copyFrom(other: this) {
        this.res = other.res;
        this.info.copyFrom(other.info);
        this.endTimeMs = other.endTimeMs;
    }

    reset() {
        this.res = null;
        this.info.setAsNormal();
    }

    onPoolCreate() { }

    onPoolRestore() {
        this.res = null;
        this.info.setAsNormal();
        this.endTimeMs = 0;
    }

    onPoolReuse() { }

    onPoolDispose() {
        this.onPoolRestore();
    }

    static isValid(target: ResManageable) {
        return target&&target.isValid;
    }

    static getUuidOfRes(res: GameResType) {
        if (res == void 0)
            return "";
        //@ts-ignore
        return res.uuid??res.id??"";
    }
}