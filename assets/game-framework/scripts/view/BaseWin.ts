import { Camera, Rect, RenderTexture, _decorator, game, renderer, screen, tween } from "cc";
import { fgui } from "../base/base";
import { BaseComponent } from "./BaseComponent";
import { CommonWin } from "./CommonWin";

const { ccclass, property } = _decorator;

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
        if (this.viewInfo && !this.viewInfo.special) {
            // let camera = this.node.addComponent(Camera);
            // camera.rect = new Rect(0, 0, 1, 1);
            // camera.clearFlags = Camera.ClearFlag.DEPTH_ONLY;
            // let texture = new RenderTexture();
            // texture.getGFXTexture
            // texture.initialize({ height: this.fcom.height, width: this.fcom.width });
            // camera.targetTexture = texture;
            // new RenderTexture();
            // camera.camera.scene.dr
            // camera.rend
            // if (this.viewInfo.sizeMode == kUiSize.mixFull) {
            //     capturePage
            //     screen.snapShot(this.viewInfo.snapShot);
            //     let image = screen.capturePage(0, 0, screen.width, screen.height);
            //     tween(this.fcom).to(0.5, { alpha: 0.6 }).call(() => {
            //         gFramework.viewMgr.close(this);
            //     }).start();
            // } else {
            gFramework.viewMgr.close(this);
            // }
        } else {
            gFramework.viewMgr.close(this);
        }
    }

    static checkOpen?(params?: any, showTips?: boolean) {
        return true;
    }
}