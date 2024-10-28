import { gameEnum } from "../utils/enum";

export enum kUiSize {
    none,
    normal,
    full,
    mixFull
}
gameEnum(kUiSize, "kUiSize");

export enum kUiJudge {
    none,
    all,
    mainUI
}
gameEnum(kUiJudge, "kUiJudge");


export enum kUiAlign {
    center,
    leftCenter,
}
gameEnum(kUiAlign, "kUiAlign");

export enum kUiParam {
    Replace,
    Collect,
}
gameEnum(kUiParam, "kUiParam");

export enum kPreviewType {
    attrPreviewRole = 101,
    attrPreviewEquipWear = 102,
    attrPreviewFabao = 103,
    attrPreviewOtherRoleInfo = 104,
    attrPreviewMiji = 105,
    attrPreviewShenBing = 106,
    attrPreviewGuildHunt = 107,
    attrPreviewBeastSoul = 108,//兽魂
    attrPreviewJTGXMonster = 109,//九天归墟
    attrPreviewCloth = 110,//时装
}
gameEnum(kPreviewType, "kPreviewType");



