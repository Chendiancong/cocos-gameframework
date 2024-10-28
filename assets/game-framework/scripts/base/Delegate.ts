class _funLinker {
    value: Function = null;
    next: _funLinker = null;
    prev: _funLinker = null;
    thiz: any = null;
    times: number = 0;
}

export interface IDelegate<FunType extends Function> {
    get entry(): FunType;
    get size(): number;
    add(f: FunType, thiz?: any);
    addOnce(f: FunType, thiz?: any);
    remove(f: FunType, thiz?: any);
    targetOff(target: any);
    clear();
}

export class Delegate<FunType extends Function> implements IDelegate<FunType> {
    _tag: string = "_delegate_";
    _head: _funLinker;
    _tail: _funLinker;
    _size: number;

    get entry() {
        return this._head.value as FunType;
    }

    get size() {
        return this._size;
    }

    constructor() {
        const me = this;
        const fl = new _funLinker;
        fl.value = function() {
            let cur = fl.next;
            while (cur != this._tail) {
                let next = cur.next;
                if (typeof cur.value == "function") {
                    if (cur.thiz != void 0)
                        cur.value.call(cur.thiz, ...arguments);
                    else
                        cur.value(...arguments);
                }
                if (cur.times > 0) {
                    if (Math.max(0, --cur.times) == 0) {
                        me.remove(<FunType>cur.value, cur.thiz);
                    }
                }
                cur = next;
            }
        }
        this._head = fl;
        this._tail = new _funLinker;
        this._head.next = this._tail;
        this._tail.prev = this._head;
        this._size = 0;
    }

    add(f: FunType, thiz?: any) {
        let cur = this._head.next;
        thiz = thiz === undefined ? null : thiz;
        while (cur != this._tail) {
            if (cur.value === f && thiz === cur.thiz)
                return null;
            cur = cur.next;
        }
        const linker = new _funLinker;
        linker.value = f;
        linker.thiz = thiz;
        const prev = this._tail.prev;
        prev.next = linker;
        linker.prev = prev;
        linker.next = this._tail;
        this._tail.prev = linker;
        ++this._size;
        return linker;
    }

    addOnce(f: FunType, thiz?: any) {
        const linker = this.add(f, thiz);
        if (linker)
            linker.times = 1;
        return linker;
    }

    remove(f: FunType, thiz?: any) {
        let cur = this._head.next;
        thiz = thiz === undefined ? null : thiz;
        while (cur != this._tail) {
            if (cur.value === f && thiz === cur.thiz) {
                this._removeNode(cur);
                break;
            }
            cur = cur.next;
        }
    }

    targetOff(target: any) {
        let cur = this._head.next;
        while (cur != this._tail) {
            if (cur.thiz === target)
                this._removeNode(cur);
            cur = cur.next;
        }
    }

    clear() {
        this._head.next = this._tail;
        this._tail.prev = this._head;
        this._size = 0;
    }

    private _removeNode(node: _funLinker) {
        const prev = node.prev;
        const next = node.next;
        prev.next = next;
        next.prev = prev;
        --this._size;
    }
}

function getDelegate<FunType extends Function>(thiz: any, key: string): Delegate<FunType> {
    let del = thiz[key];
    if (del == void 0) {
        del = thiz[key] = new Delegate<FunType>();
    }
    return del;
}

/**委托 */
export function asDelegate(classOrProto: any, propName: string) {
    let key1 = `${propName}_delegate`;
    let desc: PropertyDescriptor = {
        get: function() {
            return getDelegate<any>(this, key1);
        },
        set: function(value) {
            let del = getDelegate<any>(this, key1);
            if (value == void 0) {
                del.clear();
            } else if (value._tag == "_delegate_") {
                del._head = value._head;
                del._tail = value._tail;
            } else {
                console.warn(`set delegate type error`);
            }
        }
    }
    return desc as any;
}