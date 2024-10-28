import { Component, _decorator } from "cc";

const { ccclass } = _decorator;

@ccclass
export class BaseComponentStart extends Component {
    initHandlers: Array<() => void> = [];

    start() {
        let initHandlers = this.initHandlers;
        this.initHandlers = null;
        initHandlers.forEach((handle) => handle());
        this.destroy();
    }
}