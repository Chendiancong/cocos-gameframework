import { GButton } from "fairygui-cc";
import { FScript } from "game-framework/scripts/view/FScript";
import { fprop } from "game-framework/scripts/view/view-decorator";

export class SubPage2 extends FScript {
    @fprop
    btn: GButton;

    onLoad() {
        gFramework.log('sub page2 on load');
        this.btn.onClick(() => gFramework.log('sub page2 btn on click'));
    }
}