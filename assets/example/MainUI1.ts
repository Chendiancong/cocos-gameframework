import { GButton } from "fairygui-cc";
import { BaseWin } from "game-framework/scripts/view/BaseWin";
import { fclass, fprop } from "game-framework/scripts/view/view-decorator";

@fclass({
    packName: 'main',
    viewName: 'MainUI',
    clickout: true
})
export class MainUI1 extends BaseWin {
    @fprop
    btn1: GButton;

    open() {
        gFramework.log('main ui 1 open');
        this.btn1.onClick(() => {
            gFramework.log('btn1 clicked');
        });
    }
}