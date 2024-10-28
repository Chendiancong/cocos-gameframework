import { ObjectPool } from "../../base/ObjectPool";

export type HashListGenerator<T> = {
    next: () => Readonly<{
        value?: ReadonlyKeyValuePair<string|number, T>,
        done?: boolean
    }>
}

export class HashList<T = any> implements gFramework.IPoolItem, gFramework.IDumpable {
    private _head: HashListNode;
    private _tail: HashListNode;
    private _dic: { [key: string|number]: HashListNode };
    private _size: number;

    get head() { return this._head; }
    get tail() { return this._tail; }
    get first() { return this._head.next?.data as T; }
    get last() { return this._tail.prev?.data as T; }
    get size() { return this._size; }
    get array() { return this.convertToArray(); }

    constructor() {
        this._head = HashListNode.pool.getItem();
        this._tail = HashListNode.pool.getItem();
        this._head.next = this._tail;
        this._tail.prev = this._head;
        this._dic = {};
        this._size = 0;
    }

    add(key: string|number, data: T) {
        gFramework.assert(!(key in this._dic));
        const newNode = this._createNewNode(key, data);
        this._internalInsert(newNode, this._tail);
    }

    /** 在头部插入数据 */
    unshift(key: string|number, data: T) {
        gFramework.assert(!(key in this._dic));
        const newNode = this._createNewNode(key, data);
        this._internalInsert(newNode, this._head.next);
    }

    del(key: string|number) {
        const oldNode = this._dic[key];
        if (oldNode == void 0)
            return null;
        return this._internalDel(oldNode);
    }

    /**
     * 删除第一个符合条件的元素
     */
    delFirst(predicate: (data: T) => boolean, start?: (data: T) => boolean) {
        let isStart = start == void 0;
        for (const kv of this) {
            if (!isStart && !(isStart = start(kv.value)))
                continue;
            if (predicate(kv.value)) {
                this.del(kv.key);
                return kv.value;
            }
        }
        return void 0;
    }

    /**
     * 寻找第一个符合条件的元素
     */
    find(predicate: (data: T) => boolean, start?: (data: T) => boolean) {
        let isStart = start == void 0;
        for (const value of this.values<'custom'>()) {
            if (!isStart && !(isStart = start(value)))
                continue;
            if (predicate(value))
                return value;
        }
        return void 0;
    }

    /**
     * 寻找最后一个符合条件的元素
     */
    findLast(predicate: (data: T) => boolean, end?: (data: T) => boolean) {
        for (const value of this.reverseValues<'custom'>()) {
            if (predicate(value))
                return value;
            if (end != void 0 && end(value))
                break;
        }
        return void 0;
    }

    /**
     * 寻找所有符合条件的元素
     */
    *findAll(predicate: (data: T) => boolean, start?: (data: T) => boolean) {
        let isStart = start == void 0;
        for (const value of this.values()) {
            if (!isStart && !(isStart = start(value)))
                continue;
            if (predicate(value))
                yield value;
        }
    }

    /**
     * 在key对应的元素之后插入新的元素
     */
    insertAfter(key: string|number, newKey: string|number, newData: T) {
        gFramework.assert(key in this._dic);
        gFramework.assert(key !== newKey);
        const prevNode = this._dic[key];
        const newNode = this._createNewNode(newKey, newData);
        this._internalInsert(newNode, prevNode.next);
    }

    /**
     * 在key对应的元素之前插入新的元素
     */
    insertBefore(key: string|number, newKey: string|number, newData: T) {
        gFramework.assert(key in this._dic);
        gFramework.assert(key !== newKey);
        const nextNode = this._dic[key];
        const newNode = this._createNewNode(newKey, newData);
        this._internalInsert(newNode, nextNode);
    }

    count(filter: (data: T) => boolean) {
        let cnt = 0;
        let cur = this.head
        while ((cur = cur.next) !== this.tail) {
            if (filter(cur.data))
                ++cnt;
        }
        return cnt;
    }

    get(key: string|number) {
        return this.getNode(key)?.data as T;
    }

    containsKey(key: string|number) {
        return !!this._dic[key];
    }

    getNode(key: string|number) {
        return this._dic[key];
    }

    addNode(node: HashListNode<T>) {
        if (!node.key)
            node.key = ""+Date.now();
        this._internalInsert(node, this._tail);
    }

    delNode(node: HashListNode<T>) {
        if (this._dic[node.key])
            return this._internalDel(node);
    }

    clear() {
        this.forEachNode(n => {
            this.delNode(n);
        });
        const head = this._head;
        const tail = this._tail;
        head.next = tail;
        tail.prev = head;
        this._size = 0;
    }

    forEach(func: (data: T) => void) {
        let cur = this._head.next;
        let tail = this._tail;
        while (cur != tail) {
            const curNode = cur;
            cur = cur.next;
            func(curNode.data);
        }
    }


    forEachNode(func: (n: HashListNode<T>) => void) {
        let cur = this._head.next;
        let tail = this._tail;
        while (cur != tail) {
            const curNode = cur;
            cur = cur.next;
            func(curNode);
        }
    }

    *values<U extends 'readonly'|'custom' = 'readonly'>(): U extends 'readonly' ? Generator<Readonly<T>> : Generator<T> {
        let curNode = this._head;
        while ((curNode = curNode.next) !== this._tail)
            yield curNode.data;
    }

    *valuesAfterKey<U extends 'readonly'|'custom' = 'readonly'>(key: string): U extends 'readonly' ? Generator<Readonly<T>> : Generator<T> {
        let curNode = this.getNode(key);
        if (curNode == void 0)
            return;
        while ((curNode = curNode.next) !== this._tail)
            yield curNode.data;
    }

    *reverseValues<U extends 'readonly'|'custom' = 'readonly'>(): U extends 'readonly' ? Generator<Readonly<T>> : Generator<T> {
        let curNode = this._tail;
        while ((curNode = curNode.prev) !== this._head)
            yield curNode.data;
    }

    *keys() {
        let curNode = this._head;
        while ((curNode = curNode.next) !== this._tail) {
            yield curNode.key;
        }
    }

    *filter(filterFunc: (data: T) => boolean) {
        for (const v of this.values()) {
            if (filterFunc(v))
                yield v;
        }
    }

    convertToArray(): T[] {
        const arr: T[] = [];
        for (const v of this.values<'custom'>())
            arr.push(v);
        return arr;
    }

    [Symbol.iterator]() {
        const that = this;
        let curNode = that._head;
        const kvValue: KeyValuePair<number|string, T> = {
            key: null,
            value: null
        };
        const state = {
            get value() { return <ReadonlyKeyValuePair<number|string, T>>kvValue; },
            get done() { return curNode == that.tail; }
        }
        return <HashListGenerator<T>>{
            next: function () {
                curNode = curNode.next;
                kvValue.key = curNode.key,
                kvValue.value = curNode.data;
                return state;
            }
        }
    }

    dump() {
        for (const kv of this)
            console.log(kv.key, kv.value);
    }

    onPoolCreate() { }

    onPoolReuse() { }

    onPoolRestore() {
        this.clear();
    }

    onPoolDispose() { }

    private _createNewNode(key: string|number, data: T) {
        const node = HashListNode.pool.getItem();
        node.key = key;
        node.data = data;
        return node;
    }

    private _internalInsert(node: HashListNode<T>, nextNode: HashListNode<T>) {
        const oldNode = this._dic[node.key];
        if (oldNode == node)
            return;
        if (oldNode != void 0)
            this._internalDel(oldNode);
        const prev = nextNode.prev;
        prev.next = node;
        node.prev = prev;
        node.next = nextNode;
        nextNode.prev = node;
        this._dic[node.key] = node;
        ++this._size;
    }

    private _internalDel(node: HashListNode<T>) {
        const prev = node.prev;
        const next = node.next;
        prev.next = next;
        next.prev = prev;
        const data = node.data;
        delete node.data;
        delete this._dic[node.key];
        this._size = Math.max(0, this._size - 1);
        HashListNode.pool.pushItem(node);
        return data;
    }
}

export class HashListNode<T = any> implements gFramework.IPoolItem {
    static readonly pool = ObjectPool.create({
        ctor: () => new HashListNode()
    });

    next: HashListNode<T>;
    prev: HashListNode<T>;
    key: string|number;
    data: T;

    onPoolCreate() {}

    onPoolRestore() {
        this.next = null;
        this.prev = null;
        this.data = null;
        this.key = null;
    }

    onPoolReuse() {}

    onPoolDispose() {
        this.onPoolRestore();
    }
}