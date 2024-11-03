import { GButton, GLoader, GTextField } from "fairygui-cc";
import { BaseComponent } from "./BaseComponent";
import { BaseWin } from "./BaseWin";
import { fclass, foptional, fprop } from "./view-decorator";

@fclass
export class CommonWin extends BaseComponent {
    @foptional
    winTitle: GTextField;
    @foptional
    winIcon: GLoader;//标题
    @foptional
    winCloseBtn: GButton;
    @fprop
    @foptional
    how2playBtn: GButton;
    onLoad() { }

    start() {
        if (!!this.winCloseBtn) {
            this.winCloseBtn.soundSilence(true);
            let win = this.getComponent(BaseWin);
            if (!!win) {
                this.winCloseBtn.onClick(win.closeSelf, win);
            }
        }
        if (!!this.how2playBtn) {
            if (+this.how2playBtn.text > 0) {
                this.how2playBtn.visible = true;
            } else {
                this.how2playBtn.visible = false;
            }
        }
    }

    setWinTitleIcon(viewName: string) {
        let url = gFramework.viewMgr.getItemURL("common_temp0", viewName);
        if (!!url) {
            this.winIcon.url = url;
        }
    }
}