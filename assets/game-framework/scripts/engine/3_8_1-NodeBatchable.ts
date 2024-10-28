import { Component, Mask, Node, VERSION, _decorator } from "cc";
import { aspects } from "../utils/Aspects";
import { injectBatcher2D } from "./3_8_1-InjectBatcher2D";
import { supportVersions } from "./SupportVersions";

const { ccclass } = _decorator;

/**
 * 重写当前节点与其子节点的children属性，
 * 当isBatcherWalking=true而且该节点为batch node的时候，
 * 对其子节点进行重新排列
 * 外层的batch node将覆盖内层
 */
@ccclass("3_8_1-NodeBatchable")
export class NodeBatchable extends Component {
    private _batchedNodes: Node[] = [];

    @aspects.engineVersion(supportVersions._3_8_x)
    onLoad() {
        this.node["_mainBatchNode"] = true;

        const layerOfChildren: Node[][] = [];
        const batchedNodes = this._batchedNodes;
        const batchHandler = (node: Node, depth: number) => {
            if (layerOfChildren[depth] == void 0)
                layerOfChildren[depth] = [];
            layerOfChildren[depth].push(node);
        }
        Object.defineProperty(
            this.node,
            "children",
            {
                set: childrenDesc.set,
                get: function (this: Node) {
                    if (!injectBatcher2D.isBatcherWalking)
                        return childrenDesc.get.call(this);

                    batchedNodes.length = 0;
                    startFromRootNode(this, batchHandler);
                    for (let i = 0, len = layerOfChildren.length; i < len; ++i) {
                        batchedNodes.push(...layerOfChildren[i]);
                        layerOfChildren[i].length = 0;
                    }
                    return batchedNodes;
                }
            }
        );
    }

    onDestroy() {
        // delete this.node["_mainBatchNode"];
        // Object.defineProperty(this.node, "children", childrenDesc);
        // startFromRootNode(
        //     this.node,
        //     (node, _) => {
        //         if (node["_subBatchNode"]) {
        //             delete node["_subBatchNode"];
        //             delete node["_subBatchNodeInited"];
        //             Object.defineProperty(node, "children", childrenDesc);
        //         }
        //     }
        // )
        // this._batchedNodes.length = 0;
    }

    static setPreventBatchNode(node: Node) {
        let state = node["_subBatchNodeState"]||SubBatchNodeState.None;
        state |= SubBatchNodeState.UserPreventBatch;
        node["_subBatchNodeState"] = state;
    }
}

const enum SubBatchNodeState {
    None = 0,
    HasMask = 1,
    UserPreventBatch = HasMask<<1,
    Prevent = HasMask|UserPreventBatch,
}

const emptyArr = [];
const childrenDesc = Object.getOwnPropertyDescriptor(Node.prototype, "children");
const subChildrenDesc: PropertyDescriptor = {
    set: childrenDesc.set,
    get: function (this: Node) {
        if (injectBatcher2D.isBatcherWalking)
            return emptyArr;
        else
            return childrenDesc.get.call(this);
    },
};
function startFromRootNode(rootNode: Node, func: (node: Node, depth: number) => void) {
    const children = childrenDesc.get.call(rootNode);
    for (let i = 0, len = children.length; i < len; ++i) {
        internalWalkNode(children[i], func);
    }
}
function internalWalkNode(node: Node, func: (node: Node, depth: number) => void, depth: number = 0) {
    node["_subBatchNode"] = true;
    let state = node["_subBatchNodeState"]||SubBatchNodeState.None;
    if (!node["_subBatchNodeInited"]) {
        node["_subBatchNodeInited"] = true;
        node["_subBatchNodeState"] = state;
        if (!!node.getComponent(Mask))
            state = node["_subBatchNodeState"] |= SubBatchNodeState.HasMask;
        if (!(state&SubBatchNodeState.Prevent))
            Object.defineProperty(
                node, "children",
                subChildrenDesc
            );
    }
    func(node, depth);
    //todo
    //没有处理半透嵌套的问题
    //例如节点A[B]，A是半透明的，由于A的结构被展开了，不一定是A-B这种渲染顺序
    //因此A的透明度无法传递给B
    //暂时不要对层次化渲染的节点设置嵌套的透明度
    if (!(state&SubBatchNodeState.Prevent)) {
        const children = childrenDesc.get.call(node) as Node[];
        for (let i = 0, len = children.length; i < len; ++i) {
            depth = internalWalkNode(children[i], func, ++depth);
        }
    }
    return depth;
}