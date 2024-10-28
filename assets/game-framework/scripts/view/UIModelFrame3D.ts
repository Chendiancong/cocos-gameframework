import { _decorator } from 'cc';
import { BaseComponent } from "./BaseComponent";
import { fclass } from "./view-decorator";
import { UIModelRenderer } from '../laboratory/ui-model/scripts/UIModelRenderer';

const { requireComponent } = _decorator;

@fclass
@requireComponent([UIModelRenderer])
export class UIModelFrame3D extends BaseComponent<string> {
    private _waitingForNextRender: boolean;

    setGray(flag: boolean) {
        const renderer = this.getComponent(UIModelRenderer);
        renderer.setGray(flag);
    }

    dataChanged() {
        const url = this.data;
        const renderer = this.getComponent(UIModelRenderer);
        renderer.setModel(url);
        const camera = renderer.camera;
        if (camera?.isValid)
            camera.enabled = true;
    }

    protected onLoad() {
        const renderer = this.getComponent(UIModelRenderer);
        renderer.modelChanged.add(
            // _ => this.scheduleOnce(this._disableRendererCamera, 0),
            _ => {
                if (!this._waitingForNextRender) {
                    this._waitingForNextRender = true;
                    this.scheduleOnce(this._disableRendererCamera, 0);
                }
            },
            this
        );
        renderer.modelNoChanged.add(
            _ => {
                if (!this._waitingForNextRender) {
                    this._waitingForNextRender = true;
                    this.scheduleOnce(this._disableRendererCamera, 0);
                }
            },
            this
        );
    }

    protected onDestroy() {
        const renderer = this.getComponent(UIModelRenderer);
        renderer.modelChanged.targetOff(this);
        renderer.modelNoChanged.targetOff(this);
    }

    private _disableRendererCamera() {
        this._waitingForNextRender = false;
        const renderer = this.getComponent(UIModelRenderer);
        const camera = renderer.camera;
        if (camera?.isValid)
            camera.enabled = false;
    }
}