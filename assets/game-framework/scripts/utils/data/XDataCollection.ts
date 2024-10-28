import { EventHandler, EventTarget } from "cc";

export class XDataCollection<T> extends EventTarget {
    static readonly Events = {
        CHANGED: 'x-data-collection.changed'
    };
    static readonly ChangeType = {
        RESET: 1,
        ADD: 2,
        REMOVE: 3,
        ADD_MULT: 4,
    }

    private _source: T[];

    get source(): ReadonlyArray<T> { return this._source; }

    constructor(source?: T[]) {
        super();
        this.setDatas(source ?? []);
    }

    setDatas(source: T[]) {
        const oldDatas = this._source ?? [];
        this._source = source;
        this.emit(
            XDataCollection.Events.CHANGED,
            XDataCollection.ChangeType.RESET,
            this._source,
            oldDatas
        );
    }

    clear() {
        this.setDatas([]);
    }

    addItem(item: T) {
        this._source.push(item);
        this.emit(
            XDataCollection.Events.CHANGED,
            XDataCollection.ChangeType.ADD,
            this._source.length - 1,
            item
        );
    }

    addItems(items: T[]) {
        const _items = items.concat();
        const startIdx = this._source.length;
        for (const i of _items)
            this._source.push(i);
        this.emit(
            XDataCollection.Events.CHANGED,
            XDataCollection.ChangeType.ADD_MULT,
            startIdx,
            _items
        );
    }

    getItemIndex(item: T) {
        for (let i = 0, len = this._source.length; i < len; ++i) {
            if (this._source[i] === item)
                return i;
        }
        return -1;
    }

    removeItem(item: T) {
        const index = this.getItemIndex(item);
        if (index >= 0) {
            this._source = this._source.splice(index, 1);
            this.emit(
                XDataCollection.Events.CHANGED,
                XDataCollection.ChangeType.REMOVE,
                index, item
            );
        }
    }
}