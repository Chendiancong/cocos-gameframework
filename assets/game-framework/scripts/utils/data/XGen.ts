import { getGlobal } from "game-framework/scripts/base/base";

export type XGenState<T> = {
    done: boolean;
    value: T;
}

export type XGenerator<T> = {
    next(): XGenState<T>
}

export class XGenerable<T> {
    getGenerator: () => XGenerator<T>;

    private _dataSource: T[]|Generator<T>|Iterable<T>|Iterator<T>|XGenerable<any>;

    constructor(dataSource: T[]);
    constructor(dataSource: Generator<T>);
    constructor(dataSource: Iterable<T>);
    constructor(dataSource: Iterator<T>);
    constructor(dataSource: XGenerable<T>);
    constructor(dataSource: XGenerator<T>);
    constructor(dataSource: Record<string|number, T>);
    constructor(arg0: any) {
        this._dataSource = arg0;
        this._init();
    }

    count(predicate?: (val: T) => boolean) {
        let size = 0;
        for (const val of this) {
            if (!predicate || predicate(val))
                ++size;
        }
        return size;
    }

    sort(sorter: (a: T, b: T) => number) {
        const dataSource: T[] = [];
        for (const val of this)
            dataSource.push(val);
        dataSource.sort(sorter);
        this._dataSource = dataSource;
        this._init();
        return this;
    }

    select(predicate: (val: T) => boolean) {
        return new XGenerable<T>(this.values(predicate));
    }

    map<U>(converter: (val: T) => U) {
        const that = this;
        return new XGenerable<U>((function*() {
            for (const val of that)
                yield converter(val);
        })());
    }

    find(predicate: (val: T) => boolean) {
        for (const val of this) {
            if (predicate(val))
                return val;
        }
        return void 0;
    }

    *values(predicate?: (val: T) => boolean) {
        const generator = this.getGenerator();
        let state = generator.next();
        while (!state.done) {
            const val = state.value;
            if (!predicate || predicate(val))
                yield state.value;
            state = generator.next();
        }
    }

    [Symbol.iterator]() {
        return this.values();
    }

    private _init() {
        const dataSource = this._dataSource;
        if (Array.isArray(dataSource))
            this.getGenerator = this._fromIterable;
        else if (dataSource[Symbol.iterator])
            this.getGenerator = this._fromIterable;
        else if (dataSource['next'])
            this.getGenerator = this._fromIterator;
        else
            this.getGenerator = this._fromObject;
    }

    private _fromIterable() {
        const iterable = this._dataSource;
        return iterable[Symbol.iterator]() as XGenerator<T>;
    }

    private _fromIterator() {
        return this._enumData() as XGenerator<T>;
    }

    private *_enumData() {
        const iterator = this._dataSource as Iterator<T>;
        let state = iterator.next();
        while (!state.done) {
            yield state.value;
            state = iterator.next();
        }
    }

    private _fromObject() {
        return this._enumData2() as XGenerator<T>;
    }

    private *_enumData2() {
        const obj = this._dataSource;
        for (const k in obj)
            yield obj[k];
    }
}