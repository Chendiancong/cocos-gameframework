import { _decorator, Vec3, v3 as createV3, Button, Node, Component, Tween, tween } from "cc";
import { CustomEvent } from "../events/Event";

const v3 = createV3();
const { ccclass, property } = _decorator;
@ccclass
export class NetWaitUI extends Component {

    @property({type: Button})
    button: Button = null;
    @property({type: Node})
    rotationNode: Node = null;
    @property
    rotationTime: number = 1;
    @property
    delayShowTime: number = 2;

    private _leuler: Vec3 = new Vec3();
    private _rotateTween: Tween<Vec3> = null;

    onLoad() {
        this.node.on(CustomEvent.OPEN, this.show, this);
        this.node.on(CustomEvent.CLOSE, this.hide, this);
        Vec3.copy(this._leuler, this.node.eulerAngles);

        this._rotateTween = tween(this._leuler)
            .set(Vec3.ZERO)
            .to(this.rotationTime, v3)
            .union()
            .repeatForever();

        this.button.enabled = false;
        this.rotationNode.active = false;
    }

    update() {
        if (this._isShow && this._showTime && performance.now() >= this._showTime) {
            this._showTime = 0;
            this.showLoadingView();
        }

        if (this.rotationNode.active) {
            this.rotationNode.setRotationFromEuler(this._leuler);
        }
    }

    onEnable() {
        this._showTime = performance.now() + this.delayShowTime * 1000;
    }

    private _isShow: boolean = false;
    private _showTime: number;
    public show() {
        if (this._isShow)
            return;
        this.node.active = true;
        this.button.enabled = true;
        this._isShow = true;
    }

    public hide() {
        if (!this._isShow)
            return;
        this._isShow = false;
        this.hideLoadingView();
        this.button.enabled = false;
        this.node.active = false;
    }

    public showLoadingView() {
        this._rotateTween.start()
        this.rotationNode.active = true;
    }

    public hideLoadingView() {
        this._rotateTween.stop();
        this.rotationNode.active = false;
    }
}
