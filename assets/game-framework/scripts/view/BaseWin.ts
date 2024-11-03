import { _decorator, Component } from "cc";
import { fgui } from "../base/base";
import { BaseComponent } from "./BaseComponent";
import { CommonWin } from "./CommonWin";

const { ccclass } = _decorator;

@ccclass('BaseWin')
export class BaseWin extends BaseComponent {
    openKey: string;
    ctrlKey: string;
    fromKey?: string;

    delayOnLoad?: () => void;

    protected get observeWhenEnable() { return false; }

    get viewCtrl() {
        return gFramework.viewMgr.getViewCtrl(this.ctrlKey);
    }

    get viewInfo() {
        return this.viewCtrl?.info;
    }

    get source() {
        let ctrlKey = this.viewCtrl.sourceCtrlKey;
        if (ctrlKey)
            return gFramework.viewMgr.getViewCtrl(ctrlKey);
    }

    get fcom(): fgui.GComponent {
        return this.node && this.node["$gobj"];
    }

    setWinTitle(title: string) {
        this.getComponent(CommonWin).winTitle.text = title;
    }

    setWinTitleIcon(urlKey: string) {
        this.getComponent(CommonWin).setWinTitleIcon(urlKey);
    }

    closeSelf() {
        gFramework.viewMgr.close(this);
    }

    static checkOpen?(params?: any, showTips?: boolean) {
        return true;
    }

    static configBaseWinDelayOnLoad(clazzProtoOrIns: Component) {
        const delayOnLoad = clazzProtoOrIns['onLoad'];
        if (delayOnLoad) {
            clazzProtoOrIns['onLoad'] = doNothing;
            clazzProtoOrIns['delayOnLoad'] = delayOnLoad;
        }
    }
}

function doNothing() { }