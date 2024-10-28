//Number.MAX_SAFE_INTEGER = 9007199254740991 < 1e16

import { clamp } from "cc";
import { getGlobal } from "../../base/base";
import { gMath } from "../math/MathUtil";

//Number.MIN_SAFE_INTEGER = -9007199254740991 > 1e-16
const _10expLookupTable: { [key: number]: number } = {
    [-8]: 1e-8, [-7]: 1e-7,
    [-6]: 1e-6, [-5]: 1e-5,
    [-4]: 1e-4, [-3]: 1e-3,
    [-2]: 1e-2, [-1]: 1e-1,
    [0]: 1e0,
    [1]: 1e1, [2]: 1e2,
    [3]: 1e3, [4]: 1e4,
    [5]: 1e5, [6]: 1e6,
    [7]: 1e7, [8]: 1e8,

    [9]: 1e9, [10]: 1e10, [11]: 1e11, [12]: 1e12,
    [13]: 1e13, [14]: 1e14, [15]: 1e15,
    [-9]: 1e-9, [-10]: 1e-10, [-11]: 1e-11, [-12]: 1e-12,
    [-13]: 1e-13, [-14]: 1e-14, [-15]: 1e-15
};

const radixIntegerDigit = 7;
const radixDecimalDigit = 8;

function get10ExpResult(exp: number) {
    return _10expLookupTable[exp] ??
        (_10expLookupTable[exp] = Math.pow(10, exp));
}

class BigNumberMathElem implements gFramework.IBigNumberLike {
    radix: number = 0;
    exp: number = 0;
}

/**
 * 大数字计算数学库
 * radix为基数，exp为10的次方数
 */
export class BigNumberMath {
    static readonly tempResult = new BigNumberMathElem();

    private static _a = new BigNumberMathElem();
    private static _clampResult = new BigNumberMathElem();
    private static _convertTemp = {
        radix1: 0,
        radix2: 0,
        commonExp: 0,
    };

    static add(radix1: number, exp1: number, radix2: number, exp2: number, out?: gFramework.IBigNumberLike): gFramework.IBigNumberLike {
        out = out ?? new BigNumberMathElem();
        const r = out;
        do {
            if (exp1 == 0 && exp2 == 0) {
                r.radix = radix1 + radix2;
                r.exp = 0;
                break;
            }
            const { radix: r1, exp: e1 } = this.normalize(radix1, exp1, this._a);
            const { radix: r2, exp: e2 } = this.normalize(radix2, exp2, this._a);

            if (Math.abs(e1 - e2) > 8) {
                let bigger = e1 > e2 ? 1 : 2;
                r.radix = bigger == 1 ? r1 : r2;
                r.exp = bigger == 1 ? e1 : e2;
                break;
            }
            const convertResult = this._convertSameExp(
                r1, e1,
                r2, e2
            );
            const clampResult = this._clampRadix(
                convertResult.radix1 + convertResult.radix2,
                convertResult.commonExp
            );
            this.bigNumberCopy(r, clampResult);
        } while (false);
        return r;
    }

    static addNumbers(a: gFramework.IBigNumberLike, b: gFramework.IBigNumberLike, out?: gFramework.IBigNumberLike) {
        return this.add(
            a.radix, a.exp,
            b.radix, b.exp,
            out
        );
    }

    static minus(radix1: number, exp1: number, radix2: number, exp2: number, out?: gFramework.IBigNumberLike): gFramework.IBigNumberLike {
        out = out ?? new BigNumberMathElem();
        const r = out;
        do {
            if (exp1 == 0 && exp2 == 0) {
                r.radix = Math.max(0, radix1 - radix2);
                r.exp = 0;
                break;
            }
            const { radix: r1, exp: e1 } = this.normalize(radix1, exp1, this._a);
            const { radix: r2, exp: e2 } = this.normalize(radix2, exp2, this._a);
            if (e1 < e2) {
                r.radix = 0;
                r.exp = 0;
                break;
            }
            if (e1 == e2) {
                if (r1 < r2) {
                    r.radix = 0;
                    r.exp = 0;
                    break;
                }
            }

            if (e1 - e2 > 8) {
                r.radix = r1;
                r.exp = e1;
                break;
            }

            const convertResult = this._convertSameExp(r1, e1, r2, e2);
            const clampResult = this._clampRadix(
                (convertResult.radix1 * 100 - convertResult.radix2 * 100) / 100,
                convertResult.commonExp
            );
            this.bigNumberCopy(r, clampResult);
        } while (false);
        return r;
    }

    static minusNumbers(a: gFramework.IBigNumberLike, b: gFramework.IBigNumberLike, out?: gFramework.IBigNumberLike) {
        return this.minus(
            a.radix, a.exp,
            b.radix, b.exp,
            out
        );
    }

    /** 乘 **/
    static mul(radix1: number, exp1: number, radix2: number, exp2: number, out?: gFramework.IBigNumberLike): gFramework.IBigNumberLike {
        out = out ?? new BigNumberMathElem();
        const r = out;
        const { radix: r1, exp: e1 } = this.normalize(radix1, exp1, this._a);
        const { radix: r2, exp: e2 } = this.normalize(radix2, exp2, this._a);
        if (gMath.almostEqual(r1, 0) || gMath.almostEqual(r2, 0)) {
            r.radix = 0;
            r.exp = 0;
            return r;
        }
        const clampResult = this._clampRadix(r1 * r2, e1 + e2);
        this.bigNumberCopy(r, clampResult);
        return r;
    }

    static mulNumbers(a: gFramework.IBigNumberLike, b: gFramework.IBigNumberLike, out?: gFramework.IBigNumberLike) {
        return this.mul(
            a.radix, a.exp,
            b.radix, b.exp,
            out
        );
    }

    /** 除 **/
    static divide(radix1: number, exp1: number, radix2: number, exp2: number, out?: gFramework.IBigNumberLike): gFramework.IBigNumberLike {
        out = out ?? new BigNumberMathElem();
        const r = out;
        const { radix: r1, exp: e1 } = this.normalize(radix1, exp1, this._a);
        const { radix: r2, exp: e2 } = this.normalize(radix2, exp2, this._a);
        if (gMath.almostEqual(r1, 0)) {
            r.radix = 0;
            r.exp = 0;
            return r;
        }
        const clampResult = this._clampRadix(r1 / r2, e1 - e2);
        this.bigNumberCopy(r, clampResult);
        return r;
    }

    static divideNumbers(a: gFramework.IBigNumberLike, b: gFramework.IBigNumberLike, out?: gFramework.IBigNumberLike) {
        return this.divide(
            a.radix, a.exp,
            b.radix, b.exp, out
        );
    }

    static pow(radix: number, exp: number, powNum: number, out?: gFramework.IBigNumberLike): gFramework.IBigNumberLike {
        out = out ?? new BigNumberMathElem();
        if (powNum == 0) {
            out.radix = 1;
            out.exp = 0;
            return out;
        }
        const temp = this._a;
        this.normalize(radix, exp, temp);
        // for (let i = 0; i < powNum; ++i) {
        //     temp.radix = Math.pow(temp.radix, 2);
        //     temp.exp *= 2;
        //     this.normalize(temp.radix, temp.exp, temp);
        // }
        temp.radix = Math.pow(temp.radix, powNum);
        temp.exp *= powNum;
        return this.normalize(temp.radix, temp.exp, out);
    }

    static powNumber(n: gFramework.IBigNumberLike, powNum: number): gFramework.IBigNumberLike {
        return this.pow(n.radix, n.exp, powNum, n);
    }

    /** 纠正数值=====================
     * 服务端传过来的数值，或配置表读取的，
     * 如果指数不为0，表明底数是浮点数放大后储存的，需要除于10的7次方
     * */
    static correct(radix: number, exp: number, out?: gFramework.IBigNumberLike): gFramework.IBigNumberLike {
        out = out ?? new BigNumberMathElem();
        if (!exp) {
            return BigNumberMath.normalize(radix || 0, 0, out);
        } else {
            let tempRaix = BigNumberMath.toNumberFrom(BigNumberMath.divide(radix || 0, 0, 1, 7, out));
            return BigNumberMath.normalize(tempRaix, exp, out);
        }
    }

    /** 纠正数值，服务端传过来的数值，或配置表读取的，如果指数不为0，表明底数是浮点数放大后储存的，需要除于10的7次方*/
    static correctNumber(a: gFramework.IBigNumberLike) {
        return this.correct(a.radix, a.exp, a);
    }

    /**
     * 将数据转换为储存的形态，亦即服务端或者配置表的格式。
     * 如果底数大于7位，且指数大于0，那么就需要放大10的7次方。
     * 该过程与correct相反
     */
    static toStoragable(radix: number, exp: number, out?: gFramework.IBigNumberLike): gFramework.IBigNumberLike {
        out = out ?? new BigNumberMathElem();
        let curExp = this._log10Floor(radix);
        if (curExp >= 7 && exp > 0)
            out.exp += 7;
        return out;
    }

    /**
     * 将数据转换为储存的形态，亦即服务端或者配置表的格式。
     * 如果底数大于7位，且指数在0到7之间，那么就需要放大10的7次方。
     * 该过程与correct相反
     */
    static toStoragableNumber(a: gFramework.IBigNumberLike) {
        return this.toStoragable(a.radix, a.exp, a);
    }

    /** 转换为整数部分只有1位的科学计数法表示 */
    static normalize(radix: number, exp: number, out?: gFramework.IBigNumberLike): gFramework.IBigNumberLike {
        out = out ?? new BigNumberMathElem();
        const r = out;
        const expChange = -this._log10Floor(radix);
        r.radix = radix * get10ExpResult(expChange);
        r.exp = exp - expChange;
        return r;
    }

    static normalizeNumber(a: gFramework.IBigNumberLike) {
        this.normalize(a.radix, a.exp, a);
        return a;
    }

    /**
     * 转换为底数为8位整数的科学计数法表示，但如果总数小于1e8，那么会将总数都寄存于底数部分，指数清零。
     * 也可以用于服务器或者配置传过来的已经放大储存的数据，由于执行大数值计算过程中转换成1位整数的科学计数法表示，这个方法可以将底数还原成8位，一般在数值计算之后，调用correct方法之前使用
     */
    static accurate(radix: number, exp: number, out?: gFramework.IBigNumberLike): gFramework.IBigNumberLike {
        out = out ?? new BigNumberMathElem();
        const r = out;
        let curExp = this._log10Floor(radix);
        do {
            const totalExp = curExp + exp;
            if (totalExp >= 0 && totalExp <= 7) {
                r.radix = radix * get10ExpResult(exp);
                r.exp = 0;
                break;
            }
            const expChange = gMath.clamp(radixIntegerDigit - curExp, 0, exp);
            r.radix = radix * get10ExpResult(expChange);
            r.exp = exp - expChange;
        } while (false);
        return r;
    }

    /**
     * 转换为底数为8位整数的科学计数法表示，但如果总数小于1e8，那么会将总数都寄存于底数部分，指数清零。
     * 也可以用于服务器或者配置传过来的已经放大储存的数据，由于执行大数值计算过程中转换成1位整数的科学计数法表示，这个方法可以将底数还原成8位，一般在数值计算之后，调用correct方法之前使用
     */
    static accurateNumber(a: gFramework.IBigNumberLike) {
        this.accurate(a.radix, a.exp, a);
        return a;
    }

    static compare(radix1: number, exp1: number, radix2: number, exp2: number) {
        if (exp1 == 0 && exp2 == 0)
            return radix1 - radix2;
        const {
            radix1: r1, radix2: r2
        } = this._convertSameExp(radix1, exp1, radix2, exp2);
        return r1 - r2;
    }

    static almostCompare(radix1: number, exp1: number, radix2: number, exp2: number) {
        if (Math.abs(this.compare(radix1, exp1, radix2, exp2)) >= 1e-7) {
            if (exp1 == 0 && exp2 == 0)
                return radix1 - radix2;
            const {
                radix1: r1, radix2: r2
            } = this._convertSameExp(radix1, exp1, radix2, exp2);
            return r1 - r2;
        }
        return 0;
    }

    static compareNumbers(a: Readonly<gFramework.IBigNumberLike>, b: Readonly<gFramework.IBigNumberLike>) {
        return this.compare(
            a.radix, a.exp,
            b.radix, b.exp
        );
    }

    static almostEqual(radix1: number, exp1: number, radix2: number, exp2: number) {
        return Math.abs(this.compare(radix1, exp1, radix2, exp2)) < 1e-7;
    }

    static almostEqualNumbers(a: Readonly<gFramework.IBigNumberLike>, b: Readonly<gFramework.IBigNumberLike>) {
        return this.almostEqual(
            a.radix, a.exp,
            b.radix, b.exp
        );
    }

    private static _suffixPatterns = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    static toShowStr(radix: number, exp: number) {
        if (exp < 3 && radix < 1e3)
            return "" + Math.round(radix * get10ExpResult(exp));
        const { radix: r, exp: e } = this.normalize(radix, exp, this._a);
        if (exp < 0)
            return '0';
        let suffix = "";
        const patterns = this._suffixPatterns;
        const patternLen = patterns.length;
        const extra = e % 3;
        let x = Math.floor(e / 3);
        while (x > patternLen) {
            const remainder = x % patternLen;
            x = Math.floor(x / patternLen)
            suffix = patterns[remainder] + suffix;
        }
        if (x > 0)
            suffix = patterns[x - 1] + suffix;
        return `${(r * get10ExpResult(extra)).toFixed(2).replace(/\.?0+$/, "")}${suffix}`;
    }

    static toShowStrFrom(n: gFramework.IBigNumberLike) {
        return this.toShowStr(n.radix, n.exp);
    }

    /**
     * 转换为整数，过大或者过小则返回Infinity
     */
    static toInt(radix: number, exp: number) {
        return Math.floor(radix * get10ExpResult(exp));
    }

    /**
     * 转换为整数，过大或者过小则返回Infinity
     */
    static toIntFrom(n: gFramework.IBigNumberLike) {
        return this.toInt(n.radix, n.exp);
    }

    /** 转换为数字，过大或过小则返回Infinity */
    static toNumber(radix: number, exp: number) {
        return radix * get10ExpResult(exp);
    }

    /** 转换为数字，过大或过小则返回Infinity */
    static toNumberFrom(n: gFramework.IBigNumberLike) {
        return this.toNumber(n.radix, n.exp);
    }

    static bigNumberCopy(to: gFramework.IBigNumberLike, from: gFramework.IBigNumberLike) {
        to.radix = from.radix;
        to.exp = from.exp;
    }

    static get10ExpResult(exp: number) {
        return get10ExpResult(exp);
    }

    private static _convertSameExp(radix1: number, exp1: number, radix2: number, exp2: number) {
        //小数乘以-abs(exp1 - exp2)，转换为同幂，即max(exp1, exp2)
        const temp = this._convertTemp;
        const biggerRadix = exp1 > exp2 ? radix1 : radix2;
        const smallerRadix = exp1 > exp2 ? radix2 : radix1;
        const expDiff = Math.abs(exp1 - exp2);
        const convertedSmallerRadix = smallerRadix * get10ExpResult(-expDiff);
        temp.radix1 = exp1 > exp2 ? biggerRadix : convertedSmallerRadix;
        temp.radix2 = exp1 > exp2 ? convertedSmallerRadix : biggerRadix;
        temp.commonExp = Math.max(exp1, exp2);
        return temp;
    }

    private static _clampRadix(radix: number, exp: number) {
        const r = this._clampResult;
        r.radix = radix;
        r.exp = exp;
        // const expChange = -this._log10Floor(radix);
        // r.radix = radix * get10ExpResult(expChange);
        // r.exp = exp - expChange;
        // if (r.radix < 1e-8) {
        //     r.radix = 0;
        //     r.exp = 0;
        // }
        // this.accurateToTarget(radix, exp, r);
        return r;
    }

    private static _log10Floor(value: number) {
        let ret = 0;
        if (value >= 10) {
            while (ret <= radixIntegerDigit) {
                if (value < get10ExpResult(ret))
                    break;
                ret += 1;
            }
            ret -= 1;
        } else if (value > 1e-8 && value < 1) {
            while (ret >= -radixDecimalDigit) {
                if (value > get10ExpResult(ret))
                    break;
                ret -= 1;
            }
            // ret += 1;
        }
        return ret;
    }
}