import { arrayRemove, arraySort } from "game-framework/scripts/base/jsUtil";

export interface IHashArrayElem {
    readonly hashCode: number|string;
}

class BaseHashArray<TK, T> {
    sorters: gFramework.SortFunc<T>[];

    protected _set = new Set<TK>();
    protected _arr: T[] = [];
    protected _arrayDummy: boolean;

    get size() { return this._arr.length; }
    get array(): readonly Readonly<T>[] { return this._arr; }

    clear() {
        this._set.clear();
        this._arr.length = 0;
        this._arrayDummy = false;
    }

    clearUnuse() {
        arrayRemove(this._arr, void 0);
        this._arrayDummy = true;
    }

    sort() {
        if (this._arrayDummy && this.sorters?.length)
            arraySort(this._arr, ...this.sorters);
    }

    *values() {
        for (const value of this._arr)
            yield value;
    }

    [Symbol.iterator]() {
        return this.values();
    }

    protected _internalAdd(key: TK, data: T) {
        if (this._set.has(key))
            return;
        this._set.add(key);
        this._arr.push(data);
        this._arrayDummy = true;
    }

    protected _internalRemove(key: TK, data: T) {
        if (this._set.has(key)) {
            this._set.delete(key);
            arrayRemove(this._arr, data);
            this._arrayDummy = true;
        }
    }

    protected _internalUnuse(idx: number, key: TK, data: T) {
        if (this._arr.length <= idx)
            return;
        if (this._set.has(key) && this._arr[idx] === data) {
            this._set.delete(key);
            this._arr[idx] = void 0;
        }
    }

    protected _internalSet(idx: number, key: TK, data: T) {
        if (this._arr.length <= idx)
            throw new Error('index error');
        const curData = this._arr[idx];
        if (curData === data && this._set.has(key))
            return;
        this._arr[idx] = curData;
        this._set.add(key);
    }

    protected _internalHas(key: TK) {
        return this._set.has(key);
    }
}

export class HashArray<T> extends BaseHashArray<T, T> {
    add(data: T) {
        return this._internalAdd(data, data);
    }

    remove(data: T) {
        return this._internalRemove(data, data);
    }

    set(idx: number, data: T) {
        return this._internalSet(idx, data, data);
    }

    has(data: T) {
        return this._internalHas(data);
    }

    unuse(idx: number, data: T) {
        return this._internalUnuse(idx, data, data);
    }
}

export class AdvanceHashArray<T extends IHashArrayElem> extends BaseHashArray<T['hashCode'], T> {
    add(data: T) {
        return this._internalAdd(data.hashCode, data);
    }

    remove(data: T) {
        return this._internalRemove(data.hashCode, data);
    }

    removeByKey(key: T['hashCode']) {
        const cur = this.getByKey(key);
        if (!!cur)
            return this.remove(cur);
    }

    set(idx: number, data: T) {
        this._internalSet(idx, data.hashCode, data);
    }

    has(data: T) {
        return this._internalHas(data.hashCode);
    }

    getByKey(key: T['hashCode']) {
        for (const d of this.array) {
            if (d.hashCode === key)
                return d;
        }
        return void 0;
    }

    unuse(idx: number, data: T) {
        return this._internalUnuse(idx, data.hashCode, data);
    }
}