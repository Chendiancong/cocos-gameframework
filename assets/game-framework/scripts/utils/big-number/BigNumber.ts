import { ObjectPool } from "../../base/ObjectPool";
import { BigNumberMath } from "./BigNumberMath";

/**
 * 大数字类
 * radix为基数，exp为10的次方数
 */
export class BigNumber implements gFramework.IBigNumberLike, gFramework.IPoolItem {
    static readonly pool = ObjectPool.create({
        ctor: () => new BigNumber(0, 0)
    });

    radix: number;
    exp: number;

    get showStr() {
        return BigNumberMath.toShowStr(this.radix, this.exp);
    }

    /**
     * 转换为数字，过大或者过小则返回Infinity
     */
    get numberValue() {
        return BigNumberMath.toInt(this.radix, this.exp);
    }

    static copyFrom(result: Readonly<gFramework.IBigNumberLike>, out?: BigNumber) {
        const {
            radix, exp
        } = result;
        out = out != void 0 ?
            out.setup(radix, exp) :
            new BigNumber(radix, exp);
        return out;
    }

    constructor(radix: number, exp: number) {
        this.setup(radix, exp);
    }

    normalize() {
        return BigNumberMath.normalizeNumber(this) as BigNumber;
    }

    /**
     * 转换为底数为8位整数的科学计数法表示，但如果总数小于1e8，那么会将总数都寄存于底数部分，指数清零。
     * 也可以用于服务器或者配置传过来的已经放大储存的数据，由于执行大数值计算过程中转换成1位整数的科学计数法表示，这个方法可以将底数还原成8位，一般在数值计算之后，调用correct方法之前使用
     */
    accurate() {
        return BigNumberMath.accurateNumber(this) as BigNumber;
    }

    /** 矫正数值，服务端传过来的数值，或配置表读取的，如果指数不为0，表明底数是浮点数放大后储存的，需要除于10的7次方*/
    correct() {
        return BigNumberMath.correctNumber(this) as BigNumber;
    }

    /**
     * 将数据转换为储存的形态，亦即服务端或者配置表的格式。
     * 如果底数大于7位，且指数在0到7之间，那么就需要放大10的7次方。
     * 该过程与correct相反
     */
    toStoragable() {
        return BigNumberMath.toStoragableNumber(this)  as BigNumber;
    }

    toInt() {
        return BigNumberMath.toIntFrom(this);
    }

    toNumber() {
        return BigNumberMath.toNumberFrom(this);
    }

    setup(radix: number, exp: number) {
        this.radix = radix;
        this.exp = exp;
        return this;
    }

    changeExp(diff: number) {
        this.exp += diff;
        return this;
    }

    copyFrom(result: Readonly<gFramework.IBigNumberLike>) {
        BigNumber.copyFrom(result, this);
        return this;
    }

    addSelf(other: Readonly<gFramework.IBigNumberLike>): BigNumber;
    addSelf(otherRadix: number, otherExp: number): BigNumber;
    addSelf(...args: any[]) {
        this._callCalculateMethod(BigNumberMath.add, this, ...args);
        return this;
    }

    add(other: Readonly<gFramework.IBigNumberLike>, out?: BigNumber): BigNumber;
    add(otherRadix: number, otherExp: number, out?: BigNumber): BigNumber;
    add(...args: any[]) {
        let out = this._checkAndGetOutArg(args);
        out.copyFrom(this);
        this._callCalculateMethod(BigNumberMath.add, out, ...args);
        return out;
    }

    minusSelf(other: Readonly<gFramework.IBigNumberLike>): BigNumber;
    minusSelf(otherRadix: number, otherExp: number): BigNumber;
    minusSelf(...args: any[]) {
        this._callCalculateMethod(BigNumberMath.minus, this, ...args);
        return this;
    }

    minus(other: Readonly<gFramework.IBigNumberLike>, out?: BigNumber): BigNumber;
    minus(otherRadix: number, otherExp: number, out?: BigNumber): BigNumber;
    minus(...args: any[]) {
        let out = this._checkAndGetOutArg(args);
        out.copyFrom(this);
        this._callCalculateMethod(BigNumberMath.minus, out, ...args);
        return out;
    }

    mulSelf(other: Readonly<gFramework.IBigNumberLike>): BigNumber;
    mulSelf(otherRadix: number, otherExp: number): BigNumber;
    mulSelf(...args: any[]) {
        this._callCalculateMethod(BigNumberMath.mul, this, ...args);
        return this;
    }

    mul(other: Readonly<gFramework.IBigNumberLike>, out?: BigNumber): BigNumber;
    mul(otherRadix: number, otherExp: number, out?: BigNumber): BigNumber;
    mul(...args: any[]) {
        let out = this._checkAndGetOutArg(args);
        out.copyFrom(this);
        this._callCalculateMethod(BigNumberMath.mul, out, ...args);
        return out;
    }

    divideSelf(other: Readonly<gFramework.IBigNumberLike>): BigNumber;
    divideSelf(otherRadix: number, otherExp: number): BigNumber;
    divideSelf(...args: any[]) {
        this._callCalculateMethod(BigNumberMath.divide, this, ...args);
        return this;
    }

    divide(other: Readonly<gFramework.IBigNumberLike>, out?: BigNumber): BigNumber;
    divide(otherRadix: number, otherExp: number, out?: BigNumber): BigNumber;
    divide(...args: any[]) {
        let out = this._checkAndGetOutArg(args);
        out.copyFrom(this);
        this._callCalculateMethod(BigNumberMath.divide, out, ...args);
        return out;
    }

    powSelf(powNum: number): BigNumber {
        return BigNumberMath.pow(this.radix, this.exp, powNum, this) as BigNumber;
    }

    pow(powNum: number, out?: gFramework.IBigNumberLike) {
        out = out ?? new BigNumber(0, 0);
        return BigNumberMath.pow(this.radix, this.exp, powNum, out) as BigNumber;
    }

    compare(other: Readonly<gFramework.IBigNumberLike>): number;
    compare(otherRadix: number, otherExp: number): number;
    compare(...args: any[]) {
        return this._callCalculateMethod2(BigNumberMath.compare, this, ...args);
    }

    almostEqual(other: Readonly<gFramework.IBigNumberLike>): boolean;
    almostEqual(otherRadix: number, otherExp: number): boolean;
    almostEqual(...args: any[]) {
        return this._callCalculateMethod2(BigNumberMath.almostEqual, this, ...args);
    }

    onPoolCreate() { }

    onPoolRestore() {
        this.setup(0, 0);
    }

    onPoolReuse() { }

    onPoolDispose() { }

    private _checkAndGetOutArg(args: any[]): BigNumber {
        if (typeof args[0] != "number")
            return args[1] ?? new BigNumber(0, 0);
        else
            return args[2] ?? new BigNumber(0, 0);
    }

    private _callCalculateMethod(calculator: Function, thiz: BigNumber, ...args: any[]) {
        if (typeof args[0] != "number") {
            let other = <BigNumber>args[0];
            calculator.call(
                BigNumberMath,
                thiz.radix, thiz.exp,
                other.radix, other.exp,
                thiz
            );
        } else
            calculator.call(
                BigNumberMath,
                thiz.radix, thiz.exp,
                args[0], args[1],
                thiz
            );
    }

    private _callCalculateMethod2(calculator: Function, thiz: BigNumber, ...args: any[]) {
        if (typeof args[0] != "number") {
            const other = <gFramework.IBigNumberLike>args[0];
            return calculator.call(
                BigNumberMath,
                thiz.radix, thiz.exp,
                other.radix, other.exp
            );
        } else
            return calculator.call(
                BigNumberMath,
                thiz.radix, thiz.exp,
                args[0], args[1]
            );
    }
}