import { GButton } from "fairygui-cc";
import { BaseWin } from "game-framework/scripts/view/BaseWin";
import { fclass, fprop, ftype } from "game-framework/scripts/view/view-decorator";
import { SubPage } from "./SubPage";

@fclass({
    packName: 'main',
    viewName: 'MainUI',
    clickout: true
})
export class MainUI1 extends BaseWin {
    @fprop
    btn1: GButton;
    @ftype(SubPage)
    subPage: SubPage;

    open() {
        gFramework.log('main ui 1 open');
        this.btn1.onClick(() => {
            gFramework.log('btn1 clicked');
        });
    }
}