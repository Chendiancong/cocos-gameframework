import { GButton } from "fairygui-cc";
import { FScriptWin } from "game-framework/scripts/view/FScript";
import { fprop, fscript } from "game-framework/scripts/view/view-decorator";

@fscript({
    packName: 'main',
    viewName: 'MainUI',
    clickout: true
})
export class MainUI2 extends FScriptWin {
    @fprop
    btn1: GButton;

    open() {
        gFramework.log('main ui 2 open');
        this.btn1.onClick(() => gFramework.log('btn1 clicked'));
    }
}

