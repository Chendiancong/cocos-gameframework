import { director, Node } from "cc";
import { getGlobal } from "../base/base";
import { aspects } from "../utils/Aspects";
import { supportVersions } from "./SupportVersions";

let isBatcherWalking = false;
let walkDepth = 0;
const dontRenderKey = '_2dDontRender';

function init() {
    aspects.checkEngineVersion(supportVersions._3_8_x, true);

    const batcher = director.root.batcher2D;
    //@ts-ignore
    const walkDesc = Object.getOwnPropertyDescriptor(batcher.__proto__, "walk");

    Object.defineProperty(
        batcher,
        "walk",
        {
            configurable: true,
            value: function (node: Node, level: number = 0) {
                if (node[dontRenderKey])
                    return;
                if (walkDepth++ == 0) {
                    isBatcherWalking = true;
                    try {
                        walkDesc.value.call(this, node, level);
                    } catch (e) {
                        throw e;
                    } finally {
                        if (--walkDepth == 0)
                            isBatcherWalking = false;
                    }
                } else {
                    walkDesc.value.call(this, node, level);
                    if (--walkDepth == 0)
                        isBatcherWalking = false;
                }
            }
        }
    );
}

function node2dRenderEnable(node: Node, enable: boolean) {
    node[dontRenderKey] = !enable;
    if (enable)
        node.name = node.name.replace(/_norender$/, '');
    else
        node.name += '_norender';
}

function isNode2dRenderEnable(node: Node) {
    return !node[dontRenderKey];
}

export const injectBatcher2D = {
    init,
    /** 设置2的节点是否可渲染 */
    node2dRenderEnable,
    isNode2dRenderEnable,
    get isBatcherWalking() { return isBatcherWalking; }
}

getGlobal().node2dRenderEnable = node2dRenderEnable;