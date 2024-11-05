import { _decorator, Component } from "cc";
import { fgui } from "../base/base";
import { BaseComponent } from "./BaseComponent";
import { CommonWin } from "./CommonWin";
import type { ViewCtrl } from "./ViewCtrl";

const { ccclass } = _decorator;

export interface IBaseWin extends ViewDef.ViewComp {
    openKey: string;
    ctrlKey: string;
    fromKey?: string;

    get observeWhenEnable(): boolean;
    get viewCtrl(): ViewCtrl;
    get viewInfo(): IViewRegisterInfo;
    get source(): ViewCtrl;

    setWinTitle(title: string): void;
    closeSelf(): void;

    delayOnLoad?(): void;
}

@ccclass('BaseWin')
export class BaseWin extends BaseComponent implements IBaseWin {
    openKey: string;
    ctrlKey: string;
    fromKey?: string;

    get observeWhenEnable() { return false; }

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

    closeSelf() {
        gFramework.viewMgr.close(this);
    }

    delayOnLoad?: () => void;

    static convertAsWin() {
        return this;
    }

    static convertAsComponent(): Constructor<BaseComponent> {
        throw new Error();
    }

    static checkOpen?(params?: any, showTips?: boolean) {
        return true;
    }

    static setupDelayOnLoad(clazzProtoOrIns: Component) {
        const delayOnLoad = clazzProtoOrIns['onLoad'];
        if (delayOnLoad) {
            clazzProtoOrIns['onLoad'] = doNothing;
            clazzProtoOrIns['delayOnLoad'] = delayOnLoad;
        }
    }
}

function doNothing() { }