import { _decorator } from 'cc';
import { BaseComponent } from "./BaseComponent";
import { fclass } from "./view-decorator";
import { UIModelRenderer } from 'game-framework/scripts/laboratory/ui-model/scripts/UIModelRenderer';

const { requireComponent } = _decorator;

@fclass
@requireComponent([UIModelRenderer])
export class UIModel3D extends BaseComponent<string> {
    setGray(flag: boolean) {
        const renderer = this.getComponent(UIModelRenderer);
        renderer.setGray(flag);
    }

    dataChanged() {
        const url = this.data;
        // const url = 'demoV3/ui-model/player_1';
        this.getComponent(UIModelRenderer).setModel(url);
    }
}