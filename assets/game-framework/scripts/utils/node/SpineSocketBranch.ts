import { CCObject, Component, isValid, Node, _decorator } from "cc";

const { ccclass } = _decorator;

@ccclass('SpineSocketBranch')
export class SpineSocketBranch extends Component {
    path: string;

    declare private _visibleChildName: string;

    onLoad() {
        if (this._visibleChildName)
            this.switchChild(this._visibleChildName);
    }

    switchChild(childName: string) {
        if (!(this._objFlags&CCObject.Flags.IsOnLoadCalled))
            return;
        for (const child of this.node.children) {
            if (isValid(child))
                child.active = childName == child.name;
        }
    }
}