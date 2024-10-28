import { Component, director, isValid, Node } from "cc";

export const nodeUtil = {
    toTop,
    getComponentInChildren,
    quickSortChildren,
    setNodePersistent
}

/** 将节点移至节点树的顶端 */
function toTop(node: Node) {
    const parent = node.parent;
    if (isValid(parent)) {
        node.setSiblingIndex(parent.children.length);
    }
}

/**
 * 在node本身及其直接子节点中获取第一个相符的组件
 */
function getComponentInChildren<T extends Component>(node: Node, compClazz: Constructor<T>) {
    {
        const comp = node.getComponent(compClazz);
        if (isValid(comp))
            return comp;
    }

    for (const child of node.children) {
        const comp = child.getComponent(compClazz);
        if (isValid(comp))
            return comp;
    }
    return null;
}

/**
 * 对子节点进行排序，不采用setSiblingIndex而是直接进行排序，
 * 因此效率会更高一些。
 * @param node 
 * @param sorter 
 */
function quickSortChildren(node: Node, sorter: (a: Node, b: Node) => number) {
    node.children.sort(sorter);
    node['_updateSiblingIndex']();
}

function setNodePersistent(node: Node) {
    director.addPersistRootNode(node);
}