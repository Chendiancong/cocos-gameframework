import { ObjectPool } from "../base/ObjectPool";

type MetaKey = string|number;
type PropDecorator = (clazzOrPrototype: any, propName: string) => void;

class Meta<T = any> {
    protected infos: { [key: MetaKey]: T } = Object.create(null);
    protected defaultInfo: T;

    protected regInfo(key: MetaKey, d: T) {
        this.infos[key] = d;
        d[ClassFactory.keyName] = key;
    }

    protected getInfo(key: MetaKey) {
        return this.infos[key]??this.defaultInfo;
    }
}

export class ClassFactory<T = any> extends Meta<Constructor<T>> {
    static readonly keyName = 'ClassFactory_$classFactoryKey';

    singleIns: { [key: MetaKey]: T } = Object.create(null);

    setDefaultClass(clazz: Constructor<T>) {
        this.defaultInfo = clazz;
    }

    reg(key: MetaKey, clazz: Constructor<T>): void;
    reg<U extends T>(key: MetaKey): (clazz: Constructor<U>) => void;
    reg(key: MetaKey, clazzOrNot?: Constructor<T>) {
        if (clazzOrNot)
            this.regInfo(key, clazzOrNot);
        else {
            const that = this;
            return function (clazz: Constructor<T>) {
                that.regInfo(key, clazz);
            }
        }
    }

    getClass(key: MetaKey) {
        return this.infos[key];
    }

    getSingle(key: MetaKey) {
        let ins = this.singleIns[key];
        if (ins != void 0)
            return ins;
        ins = this.singleIns[key] = this._createInstance(key);
        return ins;
    }

    createInstance<U extends T = T>(clazz: Constructor<U>): U;
    createInstance<U extends T = T>(key: MetaKey): U;
    createInstance(keyOrClazz: any) {
        return this._createInstance(this._getKey(keyOrClazz));
    }

    hasKey(key: MetaKey) {
        return key in this.infos;
    }

    protected _getKey(keyOrClazz: any): MetaKey {
        if (keyOrClazz.prototype)
            return keyOrClazz[ClassFactory.keyName];
        else
            return keyOrClazz;
    }

    protected _tryGetCtor(key: string|number) {
        const ctor = this.getInfo(key);
        if (ctor == void 0)
            throw new Error(`ClassFactory._tryGetCtor: missing constructor of ${key}`);
        return ctor;
    }

    protected _createInstance(key: string|number) {
        const ins = new (this._tryGetCtor(key))(key);
        ins[ClassFactory.keyName] = key;
        return ins;
    }
}

export class PooledClassFactory<T extends gFramework.IPoolItem> extends ClassFactory<T> {
    private _innerPools: Record<MetaKey, ObjectPool<T>> = {};

    createInstance<U extends T = T>(clazz: Constructor<U>): U;
    createInstance<U extends T = T>(key: MetaKey): U;
    createInstance(keyOrClazz: any) {
        const key = this._getKey(keyOrClazz);
        if (!this._innerPools[key])
            this._innerPools[key] = ObjectPool.create({ ctor: () => this._createInstance(key) });
        return this._innerPools[key].getItem();
    }

    returnInstance(ins: T) {
        const key = ins[PooledClassFactory.keyName];
        if (this._innerPools[key])
            this._innerPools[key].pushItem(ins);
    }
}

export class FunctionFactory<T extends (...args) => any|void> extends Meta<T> {
    defaultFunc: Function = () => {};
    defaultCaller: any;

    constructor(defaultFunc: Function = null) {
        super();
        this.defaultFunc = defaultFunc??this.defaultFunc;
    }

    reg(key: MetaKey, funcOrNot: T): void;
    reg(key: MetaKey): (clazzOrProto: any, methodName, desc: PropertyDescriptor) => void;
    reg(key: MetaKey, funcOrNot?: T): any {
        if (funcOrNot)
            this.infos[key] = funcOrNot;
        else {
            const that = this;
            return function (clazzOrProto: any, methodName: string, desc: PropertyDescriptor) { 
                that.infos[key] = desc.value;
            }
        }
    }

    getFunc(key: MetaKey) {
        return this.infos[key]??this.defaultFunc;
    }

    callFunc(key: MetaKey, thiz?: any, ...args: Parameters<T>) {
        return this.infos[key]?.call(thiz??this.defaultCaller, ...args);
    }

    setDefaultCaller(caller: any) {
        this.defaultCaller = caller;
    }
}

type PropMetaOption<T> = {
    resetValue?: any,
    copy?: (propName: string, target: T, source: T) => void,
    copyStatic?: (propName: string, target: Constructor<T>, source: Constructor<T>) => void,
    reset?: (propName: string, target: T) => void,
    resetStatic?: (propName: string, target: Constructor<T>) => void,
    equals?: (propName: string, a: T, b: T) => boolean,
    equalsStatic?: (propName: string, a: Constructor<T>, b: Constructor<T>) => boolean,
}
const emptyPropHelperOption = Object.create(null);
const kMetaKey = '$meta';
const kClassPropInfoKey = '$meta_classPropInfo';
const kClassStaticPropInfoKey = '$meta_classStaticPropInfo';
const kInternalPropPrefix = `${kMetaKey}_inner`;
function getMetaValue(obj: any, key: string) {
    const desc = Object.getOwnPropertyDescriptor(obj, kMetaKey);
    let meta: any;
    if (desc)
        meta = desc.value
    else {
        const prototype = obj[kMetaKey] ?? {};
        meta = obj[kMetaKey] = {};
        for (const k in prototype) {
            if (typeof prototype[k] === 'object')
                meta[k] = Object.create(prototype[k]);
            else
                meta[k] = prototype[k];
        }
    }
    let val = meta[key];
    if (!val)
        val = meta[key] = {};
    return val;
}
export class ClassMeta {
    staticProp<T>(option: PropMetaOption<T>): PropDecorator;
    staticProp(clazz: any, propName: string): void;
    staticProp(...args: any[]): (clazz: any, propName: string) => void {
        const argLen = args.length;
        if (argLen === 1)
            return function (clazz: any, propName: string) {
                if (clazz.prototype == void 0)
                    // 过滤非静态属性
                    return;
                getMetaValue(clazz.prototype, kClassStaticPropInfoKey)[propName] = args[0];
            }
        else {
            if (args[0].prototype == void 0)
                return;
            getMetaValue(args[0].prototype, kClassStaticPropInfoKey)[args[1]] = emptyPropHelperOption;
        }
    }

    prop<T>(option: PropMetaOption<T>): PropDecorator;
    prop(proto: any, propName: string): void;
    prop(...args: any[]): (proto: any, propName: string) => void {
        const argLen = args.length;
        if (argLen == 1)
            return function (proto: any, propName: string) {
                if (proto.prototype != void 0)
                    // 过滤静态属性
                    return;
                getMetaValue(proto, kClassPropInfoKey)[propName] = args[0];
            }
        else {
            if (args[0].prototype != void 0)
                return;
            getMetaValue(args[0], kClassPropInfoKey)[args[1]] = emptyPropHelperOption;
        }
    }

    clone<T>(target: T, source: T) {
        //@ts-ignore
        const propInfos = getMetaValue(target.__proto__, kClassPropInfoKey);
        for (const k in propInfos) {
            const option = propInfos[k] as PropMetaOption<T>;
            if (option.copy)
                option.copy(k, target, source);
            else
                target[k] = source[k];
        }
    }

    cloneStatic<T>(target: Constructor<T>, source: Constructor<T>) {
        const propInfos = getMetaValue(target.prototype, kClassStaticPropInfoKey);
        for (const k in propInfos) {
            const option = propInfos[k] as PropMetaOption<T>;
            if (option.copyStatic)
                option.copyStatic(k, target, source);
            else
                target[k] = source[k];
        }
    }

    reset<T>(target: T) {
        //@ts-ignore
        const propInfos = getMetaValue(target.__proto__, kClassPropInfoKey);
        for (const k in propInfos) {
            const option = propInfos[k] as PropMetaOption<T>;
            if (option.reset)
                option.reset(k, target);
            else
                target[k] = option.resetValue ?? void 0;
        }
    }

    resetStatic<T>(target: Constructor<T>) {
        const propInfos = getMetaValue(target.prototype, kClassStaticPropInfoKey);
        for (const k in propInfos) {
            const option = propInfos[k] as PropMetaOption<T>;
            if (option.resetStatic)
                option.resetStatic(k, target);
            else
                target[k] = option.resetValue ?? void 0;
        }
    }

    equals<T>(a: T, b: T) {
        //@ts-ignore
        const propInfos = getMetaValue(a.__proto__, kClassPropInfoKey);
        let ret = true;
        for (const k in propInfos) {
            const option = propInfos[k] as PropMetaOption<T>;
            if (option.equals)
                ret = option.equals(k, a, b);
            else
                ret = a[k] === b[k];
            if (!ret)
                break;
        }
        return ret;
    }

    equalsStatic<T>(a: Constructor<T>, b: Constructor<T>) {
        const propInfos = getMetaValue(a.prototype, kClassStaticPropInfoKey);
        let ret = true;
        for (const k in propInfos) {
            const option = propInfos[k] as PropMetaOption<T>;
            if (option.equalsStatic)
                ret = option.equalsStatic(k, a, b);
            else
                ret = a[k] === b[k];
            if (!ret)
                break;
        }
        return ret;
    }
}

export const classMeta = new ClassMeta();