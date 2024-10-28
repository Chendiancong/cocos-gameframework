import { Component, _decorator } from "cc";
import { IUIData, XUIDataComp } from "./XUIDataComp";
import { aspects } from "../../Aspects";

const { ccclass, requireComponent } = _decorator;

@ccclass('XUINode')
@requireComponent([XUIDataComp])
export class XUINode<T extends IUIData = IUIData> extends Component {
    private _data: IUIData;

    get data() { return this._data as T; }
    set data(value: T) { this._data = value; }

    protected onLoad() {
        this.node.on(XUIDataComp.Events.DATA_CHANGED, this._dataChanged, this);
    }

    protected onDestroy() {
        this.node.targetOff(this);
    }

    protected dataChanged?(d: T): void;

    protected editorDataChanged?(d: T): void;

    private _dataChanged(d: IUIData) {
        this._data = d;
        if (aspects.checkEditor())
            this.editorDataChanged?.call(this, d);
        else
            this.dataChanged?.call(this, d);
    }
}