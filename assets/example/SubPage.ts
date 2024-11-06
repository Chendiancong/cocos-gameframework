import { GButton } from "fairygui-cc";
import { BaseComponent } from "game-framework/scripts/view/BaseComponent";
import { fprop } from "game-framework/scripts/view/view-decorator";

export class SubPage extends BaseComponent {
    @fprop
    btn: GButton;

    onLoad() {
        gFramework.log('sub page onload');

        this.btn.onClick(() => gFramework.log('sub page btn on click'));
    }
}