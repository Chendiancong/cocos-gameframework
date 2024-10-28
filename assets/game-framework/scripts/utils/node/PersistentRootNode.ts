import { _decorator, Component } from 'cc';
import { nodeUtil } from './NodeUtil';
const { ccclass } = _decorator;

@ccclass('PersistentRootNode')
export class PersistentRootNode extends Component {
    onLoad() {
        nodeUtil.setNodePersistent(this.node);
    }
}