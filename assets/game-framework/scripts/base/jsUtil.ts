import { js } from "cc";
import { Pipe } from "../utils/Pipe";
import { mixin } from "./base-decorator";

function mixinProperties(obj, proto) {
    for (var prop in proto) {
        if (!obj.hasOwnProperty(prop)) {
            obj[prop] = proto[prop];
        }
    }
    return obj;
}

/** 设置对象的原型 */
export let setPrototypeOf =
    Object.setPrototypeOf || { __proto__: [] } instanceof Array
        ? function (obj, proto) {
              obj.__proto__ = proto;
              return obj;
          }
        : mixinProperties;

/** 混入 */
export function applyMixins<T>(derivedCtor: Constructor<T>|AbstractConstructor<T>, baseCtors: Constructor[]) {
    let mixinCls = derivedCtor.prototype['$mixinCls'] as any[];
    if (!mixinCls)
        mixinCls = derivedCtor.prototype['$mixinCls'] = [];
    baseCtors.forEach((baseCtor) => {
        Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
            // if (name !== "constructor" && !(name in derivedCtor.prototype))
            if (name !== "constructor" && !Object.getOwnPropertyDescriptor(derivedCtor.prototype, name))
                Object.defineProperty(
                    derivedCtor.prototype,
                    name,
                    Object.getOwnPropertyDescriptor(baseCtor.prototype, name)
                );
        });
        if (!mixinCls.includes(baseCtor))
            mixinCls.push(baseCtor);
    });
}

export function hasMixin<T, U>(target: T, baseCtor: Constructor<U>) {
    if (target == void 0)
        return target === baseCtor;
    const mixinCls = target['$mixinCls'] as any[];
    if (!mixinCls)
        return false;
    return mixinCls.includes(baseCtor);
}

export function isExtends<T, U>(target: Constructor<T>, base: Constructor<U>) {
    return xInstanceOf(target?.prototype ?? void 0, base);
}

export function xInstanceOf<T>(target: T, baseCtorName: string): boolean;
export function xInstanceOf<T, U>(target: T, baseCtor: Constructor<U>): boolean;
export function xInstanceOf(...args: any[]): boolean {
    if (typeof args[1] === 'string')
        return xInstanceOf(args[0], js.getClassByName(args[1]));
    else
        return args[0] instanceof args[1] || hasMixin(args[0], args[1]);
}

type ForceToFunction<T> = T extends (...args) => any ? T : () => void;
type ReflectInvokeRet<T> = {
    isOk: boolean;
    returnValue: T
}

/** 如果target是clazz类型，就执行方法 */
export function reflectInvoke<T, U, K extends KeysWithType<U, Function>>(target: T, clazz: Constructor<U>, methodName: K, ...args: Parameters<ForceToFunction<U[K]>>): ReflectInvokeRet<ReturnType<ForceToFunction<U[K]>>> {
    const ret: ReflectInvokeRet<ReturnType<ForceToFunction<U[K]>>> = {
        isOk: xInstanceOf(target, clazz),
        returnValue: void 0
    };
    if (ret.isOk)
        ret.returnValue = (target[methodName as any] as Function).call(target, ...args);
    return ret;
}

export function ifSameAndChange<T, K extends keyof T>(target: T, propName: K, compareValue: T[K], changeValue: T[K]) {
    if (target[propName] === compareValue)
        target[propName] = changeValue;
}

const errorObject = { value: null };
export function trycatch(fn: Function, ctx: any, args?: any[]) {
    try {
        return fn.apply(ctx, args);
    } catch (err) {
        errorObject.value = err;
        return errorObject;
    }
}

/**
 * 深拷贝对象
 */
export function clone<T>(obj: T): T {
    var copy: any;

    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    if (obj instanceof Array) {
        copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }

    // if (obj instanceof dcodeIO.Long) {
    //     copy = new dcodeIO.Long(obj.low, obj.high, obj.unsigned);
    //     return copy;
    // }

    if (obj instanceof Object) {
        copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
        }
        Object.setPrototypeOf(copy, Object.getPrototypeOf(obj));
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
}

export function deepCopyMap<K, V>(originalMap: Map<K, V>): Map<K, V> {
    const newMap = new Map<K, V>();
    originalMap.forEach((value: V, key: K) => {
        const valueToAdd = (typeof value === 'object' && value !== null) ? JSON.parse(JSON.stringify(value)) : value;
        newMap.set(key, valueToAdd);
    });
    return newMap;
}

/**
 * 是否空对象({}, [], null, undefined)
 */
export function isEmpty(obj: any) {
    for (let k in obj) if (obj.hasOwnProperty(k)) return false;
    return true;
}

/**
 * 元素按顺序插入数据 插入排序
 */
export function insertSort<T>(
    arr: T[],
    element: T,
    sort: (a: T, b: T) => number
) {
    let i = arr.length;
    arr.push(element);
    while (i != 0 && sort(arr[i - 1], element) > 0) {
        arr[i] = arr[i - 1];
        i--;
    }
    arr[i] = element;
}

/** 删除数组的特定元素 */
export function arrayRemove<T>(array: T[], element: T) {
    let i = 0, j = 0, l = array.length;
    while (j < l) {
        if (array[j] !== element) {
            array[i++] = array[j];
        }
        j++;
    }
    array.length = i;
}

/** 删除数组多个特定元素 */
export function arrayRemoveMany<T>(array: T[], toRemove: readonly T[]) {
    const set = new Set<T>(toRemove);
    let i = 0, j = 0, l = array.length;
    while (j < l) {
        if (!set.has(array[j]))
            array[i++] = array[j];
        j++;
    }
    array.length = i;
}

export function arrayFilter<T>(array: T[], filter: (element: T) => boolean) {
    let i = 0, j = 0, l = array.length;
    while (j < l) {
        if (filter(array[j])) {
            array[i++] = array[j];
        }
        j++;
    }
    array.length = i;
}

/**
 * 元素按顺序插入数据 插入排序
 */
export function arrayInsert<T>(
    arr: T[],
    element: T,
    sort: (a: T, b: T) => number
) {
    let i = arr.length;
    arr.push(element);
    while (i != 0 && sort(arr[i - 1], element) > 0) {
        arr[i] = arr[i - 1];
        i--;
    }
    arr[i] = element;
}

/** 数组复制 */
export function arrayCopy<T>(target: T[], source: T[]) {
    target.length = source.length;
    for (let i = 0, len = source.length; i < len; ++i)
        target[i] = source[i];
    return target;
}

/**
 * 数组切分
 * @param target 需要切分的数组
 * @param getSliceNum 获取下一次切分的数量
 */
export function arraySlice<T>(target: T[], getSliceNum: () => number) {
    let arr = target.concat();
    let sliceNum = Math.min(arr.length, getSliceNum());
    const ret: T[][] = [];
    while (sliceNum > 0) {
        ret.push(arr.slice(0, sliceNum));
        arr = arr.slice(sliceNum);
        sliceNum = Math.min(arr.length, getSliceNum());
    }
    return ret;
}

/**
 * 数组排序
 * @param target 需要排序的数组
 * @param sorters 排序规则
 */
export function arraySort<T>(target: T[], ...sorters: gFramework.SortFunc<T>[]) {
    target.sort((a, b) => {
        for (let i = 0, len = sorters.length; i < len; ++i) {
            const ret = sorters[i](a, b);
            if (ret !== 0)
                return ret;
        }
        return 0;
    });
    return target;
}

export function object2Array<T, U>(obj: T, converter: (elem: T[keyof T], key: keyof T) => U): U[] {
    const arr: U[] = [];
    for (const k in obj) {
        const elem = obj[k];
        arr.push(converter(elem, k));
    }
    return arr;
}

export function arrayCheckAnd<T>(arr: T[], checker: (elem: T) => boolean) {
    for (const item of arr) {
        if (!checker(item))
            return false;
    }
    return true;
}

export function arrayCheckOr<T>(arr: T[], checker: (elem: T) => boolean) {
    if (!arr.length)
        return true;
    let ret = false;
    for (const item of arr)
        ret = ret || checker(item);
    return ret;
}

export function arrayCount<T>(arr: T[], checker: (elem: T) => boolean) {
    let cnt = 0;
    for (const item of arr) {
        if (checker(item))
            ++cnt;
    }
    return cnt;
}

export function js_value<T, U extends (keyof WithType<T, Function>)&string>(obj: T, key: U, _value: T[U], writable?: boolean, enumerable?: boolean) {
    js.value(obj, key, _value, writable, enumerable);
}

export function js_get<T, U extends (keyof WithoutType<T, Function>)&string>(obj: T, key: U, _getter: () => T[U], enumerable?: boolean, configurable?: boolean) {
    js.get(obj, key, _getter, enumerable, configurable);
}

export function js_set<T, U extends (keyof WithoutType<T, Function>)&string>(obj: T, key: U, _setter: (val: T[U]) => void, enumerable?: boolean, configurable?: boolean) {
    js.set(obj, key, _setter, enumerable, configurable);
}