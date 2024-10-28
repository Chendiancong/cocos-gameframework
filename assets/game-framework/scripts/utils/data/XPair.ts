import { debugUtil } from "game-framework/scripts/base/debugUtil";

type PairV = number|string|symbol;

export interface IXPair<TA extends PairV, TB extends PairV> {
    addPair(a: TA, b: TB): void;
    removePair(a: TA, b: TB): void;
    getA(b: TB): TA;
    getB(a: TA): TB;
}

export type XPairCustom<TA extends PairV, TB extends PairV, NameA extends string, NameB extends string> =
    IXPair<TA, TB> &
    DefPropsWithName<NameA, (b: TB) => TA, 'get'> &
    DefPropsWithName<NameB, (a: TA) => TB, 'get'>

export class XPair<TA extends PairV, TB extends PairV, NameA extends string, NameB extends string> implements IXPair<TA, TB> {
    private _a2b: { [K in TA]?: TB } = {};
    private _b2a: { [K in TB]?: TA } = {};

    get custom() {
        return this as any as XPairCustom<TA, TB, NameA, NameB>;
    }

    static create<_TA extends PairV, _TB extends PairV, NameA extends string, NameB extends string>(nameA: NameA, nameB: NameB) {
        const xpair = new XPair<_TA, _TB, NameA, NameB>(nameA, nameB);
        return xpair.custom;
    }

    constructor(nameA: NameA = <NameA>'A', nameB: NameB = <NameB>'B') {
        Object.defineProperty(
            this, `get${nameA}`,
            {
                value: function(this: XPair<TA, TB, NameA, NameB>, b: TB) {
                    return this.getA(b);
                }
            }
        );
        Object.defineProperty(
            this, `get${nameB}`,
            {
                value: function (this: XPair<TA, TB, NameA, NameB>, a: TA) {
                    return this.getB(a);
                }
            }
        )
    }

    addPair(a: TA, b: TB): void {
        this._a2b[a] = b;
        this._b2a[b] = a;
    }

    removePair(a: TA, b: TB): void {
        debugUtil.assert(this._a2b[a] === b);
        debugUtil.assert(this._b2a[b] === a);
        delete this._a2b[a];
        delete this._b2a[b];
    }

    getA(b: TB): TA {
        return this._b2a[b];
    }

    getB(a: TA): TB {
        return this._a2b[a];
    }
}