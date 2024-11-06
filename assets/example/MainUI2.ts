import { GButton } from "fairygui-cc";
import { FScriptWin } from "game-framework/scripts/view/FScript";
import { fprop, fscript, ftype } from "game-framework/scripts/view/view-decorator";
import { SubPage2 } from "./SubPage2";

@fscript({
    packName: 'main',
    viewName: 'MainUI',
    clickout: true
})
export class MainUI2 extends FScriptWin {
    @fprop
    btn1: GButton;
    @ftype(SubPage2)
    subPage: SubPage2;

    open() {
        gFramework.log('main ui 2 open');
        this.btn1.onClick(() => gFramework.log('btn1 clicked'));
    }

    close() {
        gFramework.log('main ui 2 close');
    }
}

