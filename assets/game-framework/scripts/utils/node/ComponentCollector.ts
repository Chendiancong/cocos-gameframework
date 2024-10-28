import { Component, Node } from "cc";

export class ComponentCollector<T extends Component> {
    private _comps: T[];
    declare private _clazz: Constructor<T>;

    get comps(): ReadonlyArray<T> { return this._comps; }
    get size() { return this._comps.length; }

    constructor(clazz: Constructor<T>) {
        this._clazz = clazz;
    }

    setup(node: Node) {
        this._comps = node.getComponentsInChildren(this._clazz);
    }

    callForEach(func: (comp: T) => void) {
        if (!this._comps)
            return;
        for (let i = this._comps.length; --i >= 0; ) {
            func(this._comps[i]);
        }
    }
}