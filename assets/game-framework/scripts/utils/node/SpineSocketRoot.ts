import { _decorator, Component, sp } from 'cc';
import { SpineSocketBranch } from './SpineSocketBranch';
const { ccclass } = _decorator;

@ccclass('SpineSocketRoot')
export class SpineSocketRoot extends Component {
    private _curSockets: Record<string, SpineSocketBranch> = Object.create(null);

    addSockets(sockets: sp.SpineSocket[]) {
        const curSockets = this._curSockets;
        for (const s of sockets) {
            let cur = curSockets[s.path];
            let target = s.target?.getComponent(SpineSocketBranch);
            if (cur != target)
                delete curSockets[s.path];
            if (target)
                curSockets[s.path] = target;
        }
    }

    removeSocketsByPath(socketPaths: string[]) {
        const curSockets = this._curSockets;
        for (const path of socketPaths)
            delete curSockets[path];
    }

    getSocketNodesWithPattern(pattern: RegExp|string): ReadonlyArray<SpineSocketBranch> {
        const ret: SpineSocketBranch[] = [];
        const curSockets = this._curSockets;
        for (const path in curSockets) {
            if (path.search(pattern) > 0)
                ret.push(curSockets[path]);
        }
        return ret;
    }
}