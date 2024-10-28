import { _decorator, Component, view, screen, UITransform } from 'cc';
import { EDITOR } from 'cc/env';
const { ccclass, requireComponent, executeInEditMode } = _decorator;

@ccclass('FullScreen')
@requireComponent(UITransform)
@executeInEditMode
export class FullScreen extends Component {
    start() {
        view.on("design-resolution-changed", this._onResize, this);
        view.on("canvas-resize", this._onResize, this);
        this._onResize();
    }

    onDestroy() {
        view.targetOff(this);
    }

    private _onResize() {
        const { width, height } = FullScreen.getFullScreenSize();
        const uiTrans = this.getComponent(UITransform);
        uiTrans.width = width;
        uiTrans.height = height;
    }

    static getFullScreenSize(size?: { width: number, height: number }) {
        size = size ?? { width: 0, height: 0 };
        const windowSize = screen.windowSize;
        const scaleX = view.getScaleX();
        const scaleY = view.getScaleY();
        size.width = windowSize.width/scaleX;
        size.height = windowSize.height/scaleY;
        return size;
    }
}

if (EDITOR) {
    //@ts-ignore
    FullScreen.prototype._onResize = function (this: FullScreen) {
        const { width, height } = view.getDesignResolutionSize();
        const uiTrans = this.getComponent(UITransform);
        uiTrans.width = width;
        uiTrans.height = height;
    }
}