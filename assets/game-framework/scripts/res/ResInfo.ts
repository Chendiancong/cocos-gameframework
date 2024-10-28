import { Component, Enum, _decorator } from "cc";

const { ccclass, property } = _decorator;

export enum ResExpireType {
    Normal,
    Forever,
    UnuseTime
}
Enum(ResExpireType);

@ccclass("ResInfo")
export class ResInfo {
    static readonly normal: ResInfo = null;

    @property({
        type: ResExpireType,
        displayName: "资源过期类型",
    })
    /** 资源过期类型 */
    expireType: ResExpireType = ResExpireType.Normal;
    @property({
        displayName: "资源过期时间（秒）",
        min: 1,
        visible: function() {
            return this.expireType == ResExpireType.UnuseTime
        }
    })
    /** 资源过期时间（秒） */
    expireSec: number = 1;

    copyFrom(other: this) {
        this.expireType = other.expireType;
        this.expireSec = other.expireSec;
    }

    setAsNormal() {
        this.expireType = ResExpireType.Normal;
        this.expireSec = 1;
    }
}

const normalResInfo = new ResInfo();
normalResInfo.expireType = ResExpireType.Normal;
normalResInfo.expireSec = 1;
(<any>ResInfo).normal = normalResInfo;

@ccclass("ResInfoComponent")
export class ResInfoComponent extends Component {
    @property(ResInfo)
    info: ResInfo = new ResInfo();
}