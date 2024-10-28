import { Component, Node, _decorator } from 'cc';

const { ccclass, property } = _decorator;

export interface IUIData {
    title?: string;
    content?: string;
}

@ccclass('XUIDataComp.UIData')
export class UIData implements IUIData {
    @property
    title: string = 'title';
    @property({ multiline: true })
    content: string = 'content';
}

@ccclass('XUIDataComp')
export class XUIDataComp extends Component {
    static readonly Events = {
        DATA_CHANGED: 'xui-data-comp.dataChanged'
    }

    @property(UIData)
    get data() { return this._data; }
    set data(d: IUIData) {
        this._data = d;
        (this._target ?? this.node).emit(XUIDataComp.Events.DATA_CHANGED, d);
    }

    @property({ type: UIData, serializable: true })
    private _data: IUIData = new UIData();
    private _target: Node;

    getData<T extends IUIData>() {
        return this._data as T;
    }

    setTarget(target: Node) {
        this._target = target;
    }
}