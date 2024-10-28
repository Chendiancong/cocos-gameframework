export interface ILinkedListNode {
    next: ILinkedListNode|undefined;
    prev: ILinkedListNode|undefined;
}

export class LinkedListNode implements ILinkedListNode {
    next: LinkedListNode;
    prev: LinkedListNode;
    value: any;
}

export class LinkedList<T extends ILinkedListNode = LinkedListNode> {
    private _head: ILinkedListNode;
    private _tail: ILinkedListNode;
    private _size: number;

    get size() { return this._size; }
    get first() { return this._head.next as T; }
    get last() { return this._tail.prev as T; }

    constructor() {
        this._head = new LinkedListNode();
        this._tail = new LinkedListNode();
        this._head.next = this._tail;
        this._tail.prev = this._head;
        this._size = 0;
    }

    contains(value: T) {
        for (const v of this.values()) {
            if (v === value)
                return true;
        }

        return false;
    }

    add(value: T) {
        const prev = this._tail.prev;
        value.next = this._tail;
        this._tail.prev = value;
        prev.next = value;
        value.prev = prev;
        ++this._size;
    }

    remove(value: T) {
        let isOk = false;
        for (const v of this) {
            if (v === value) {
                const next = v.next,
                    prev = v.prev;
                prev.next = next;
                next.prev = prev;
                --this._size;
                isOk = true;
                break;
            }
        }
        return isOk;
    }

    clear() {
        this._head.next = this._tail;
        this._tail.prev = this._head;
    }

    find(predicate: (data: T) => boolean) {
        let cur = this._head.next as T;
        while (cur !== this._tail) {
            if (predicate(cur))
                return cur;
            cur = cur.next as T;
        }
        return null;
    }

    findLast(predicate: (data: T) => boolean) {
        let cur = this._tail.prev as T;
        while (cur !== this._head) {
            if (predicate(cur))
                return cur;
            cur = cur.prev as T;
        }
        return null;
    }

    findIndex(data: T) {
        let cur = this._head.next;
        let index = -1;
        let curIdx = 0;
        while (cur !== this._tail) {
            if (cur === data) {
                index = curIdx;
                break;
            }
            cur = cur.next;
            ++curIdx;
        }
        return index;
    }

    *values() {
        let cur = this._head.next;
        while(cur !== this._tail) {
            yield cur as T;
            cur = cur.next;
        }
    }

    [Symbol.iterator]() { return this.values(); }
}