import { Component, director, game, isValid, Node } from "cc";
import { HashList } from "../utils/data/HashList";
import { ResManageable } from "./ResKeeper";

export class ResReleaser extends Component {
    private static _ins: ResReleaser;
    static get ins() {
        if (!isValid(this._ins)) {
            const node = new Node("ResReleaser");
            node.parent = director.getScene();
            // director.addPersistRootNode(node);
            this._ins = node.addComponent(ResReleaser);
        }
        return this._ins;
    }

    private _resToRelease: HashList<ResManageable> = new HashList<ResManageable>();

    add(res: ResManageable) {
        const _res = ResManageable.pool.getItem();
        _res.copyFrom(res);
        _res.addRef();
        this._resToRelease.add(_res.uuid, _res);
    }

    del(res: ResManageable) {
        const _res = this._resToRelease.del(res.uuid);
        if (_res != void 0) {
            _res.decRef();
            ResManageable.pool.pushItem(_res);
        }
    }

    onLoad() {
        const checkEndTime = (res: ResManageable) => {
            const curTime = game.totalTime;
            if (curTime >= res.endTimeMs) {
                res.decRef();
                this._resToRelease.del(res.uuid);
            }
        }

        this.schedule(() => {
            this._resToRelease.forEach(checkEndTime);
        }, 1);
    }

    onDestroy() {
        const list = this._resToRelease;
        list.forEach(d => {
            d.decRef();
            ResManageable.pool.pushItem(d);
        });
        list.clear();
    }
}