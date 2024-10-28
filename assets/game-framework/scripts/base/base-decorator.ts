import { director, isValid, js, Node } from "cc";
import { DEBUG } from "cc/env";
import { MessageCenter } from "../events/MessageCenter";
import { applyMixins } from "./jsUtil";
import { ISystemRegisterInfo, systemMgr } from "./SystemMgr";

function gameSystemHelper(prop: ISystemRegisterInfo, classConstructor: any) {
    let className = prop.className;
    if (!DEBUG)
        js.setClassName(className, classConstructor);

    prop = prop || <any>{};
    prop.clazz = classConstructor;
    
    systemMgr.reg(prop);
    MessageCenter.compile(classConstructor);
}

export function gameSystem(className: string)
export function gameSystem(prop: ISystemRegisterInfo)
export function gameSystem(param: any) {
    if (typeof param === "string") {
        param = { className: param };
    }
    return gameSystemHelper.bind(null, param);
}

function gameSubSystemHelper(prop: ISystemRegisterInfo, classConstructor: any) {
    let className = prop.className;
    if (!DEBUG)
        js.setClassName(className, classConstructor);
    MessageCenter.compile(classConstructor);
}

export function gameSubSystem(className: string)
export function gameSubSystem(prop: ISystemRegisterInfo)
export function gameSubSystem(param: any) {
    if (typeof param === "string") {
        param = { className: param };
    }
    return gameSubSystemHelper.bind(null, param);
}

export function mixin(prop: { [x: string]: any })
export function mixin(ctor: Constructor)
export function mixin(ext: any) {
    if (typeof ext == "function") {
        return function (ctor: Constructor) {
            applyMixins(ctor, [ext]);
        }
    }

    return function (ctor: Constructor) {
        js.mixin(ctor.prototype, ext);
    }
}

export function static_mixin(prop: { [x: string]: any }) {
    return function (ctor: Constructor) {
        js.mixin(ctor, prop);
    }
}

export function categorize(container: Array<Constructor>) {
    return function (ctor: Constructor) {
        container.push(ctor);
    }
}

/** 能否枚举 */
export function enumerable(b: boolean) {
    return function (target: any, key: string, descriptor: PropertyDescriptor) {
        descriptor.enumerable = b;
        return descriptor;
    }
}
/** 不可枚举 */
export function nonenumerable(target: any, key: string, descriptor: PropertyDescriptor) {
    descriptor.enumerable = false;
    return descriptor;
}

/** 只执行一次 */
export function callOnce(classPrototype: any, name: string, property: PropertyDescriptor) {
    let key = "$" + name + "_callOnce";
    let func = property.value;
    property.value = function (...args: any[]) {
        if (!this[key]) {
            this[key] = true;
            return func.apply(this, args);
        }
    }
    return property;
}

/**
 * 为类的方法添加延迟执行的功能。
 * @param delay 延迟的秒数。
 * @returns 返回一个用于修改类原型方法的函数。
 */
export function callDelay(delay: number) {
    /**
     * 修改类原型方法，使其具有延迟执行的功能。
     * @param classPrototype 类的原型对象。
     * @param name 方法的名字。
     * @param property 方法的属性描述符。
     * @returns 返回修改后的属性描述符。
     */
    return function (classPrototype: any, name: string, property: PropertyDescriptor) {
        let func = property.value; // 原方法
        let key = "$" + name + "_callDelay"; // 私有属性键名，用于存储是否已安排执行
        let keyArgs = key + "_args"; // 私有属性键名，用于存储方法的参数
        /**
         * 实际执行原方法的函数。
         */
        let _func = function () {
            let self = this;
            delete self[key]; // 执行后删除安排标志
            func.apply(self, self[keyArgs]); // 使用存储的参数执行原方法
            delete self[keyArgs]; // 执行后删除参数存储
        }

        // 修改方法的实现
        property.value = function (...args: any[]) {
            let funcArgs = this[keyArgs]; // 方法参数存储
            if (!funcArgs) {
                funcArgs = this[keyArgs] = []; // 初始化参数存储
            } else {
                funcArgs.length = 0; // 清空旧参数
            }

            // 存储新参数
            for (let i = 0; i < args.length; i++) {
                funcArgs[i] = args[i];
            }

            // 如果还未安排执行，则安排执行
            if (!this[key]) {
                if (!!this.scheduleOnce) {
                    // 如果支持 scheduleOnce 方法，则使用之
                    this.scheduleOnce(_func, delay);
                } else {
                    // 否则使用 setTimeout 来安排执行
                    setTimeout(_func.bind(this), delay * 1e3);
                }
                this[key] = true; // 设置已安排执行的标志
            }
        };
        return property; // 返回修改后的属性描述符
    }
}

export function jsClass(className: string);
export function jsClass<T>(ctor: { new(): T });
export function jsClass(ctorOrName: any) {
    if (typeof ctorOrName == "string")
        return function <T>(ctor: { new(): T }) {
            js.setClassName(ctorOrName, ctor);
        }
    else
        js.setClassName((ctorOrName as { new(): any }).name, ctorOrName);
}

function _autoProperty(clazzOrProto: any, propertyName: string, initial?: (() => any)|number|string|null|undefined) {
    let internalKey = `_${propertyName}`;
    let desc: PropertyDescriptor = {
        get: function () {
            let value = this[internalKey];
            if (value == void 0 && initial != void 0)
                if (typeof initial == "function")
                    value = this[internalKey] = initial.call(this);
                else
                    value = this[internalKey] = initial;
            return value;
        },
        set: function (value: any) {
            this[internalKey] = value;
        },
        configurable: true,
        enumerable: true,
    }
    return desc as any;
}
export function autoProperty(initial: (() => any)|number|string|boolean|null|undefined);
export function autoProperty(clazzOrProto: any, propertyName: string);
export function autoProperty(p1: any, p2?: any) {
    if (p2 != void 0)
        return _autoProperty(p1, p2, null);
    else
        return function (clazzOrProto: any, propertyName: string) {
            return _autoProperty(clazzOrProto, propertyName, p1);
        }
}

export function singleton(clazz: any, propertyName: string) {
    if (clazz.prototype == void 0)
        throw new Error('static property is required');
    return _autoProperty(
        clazz,
        propertyName,
        () => new clazz()
    );
}

export function componentSingleton(clazz: any, propertyName: string) {
    if (clazz.prototype == void 0)
        throw new Error('static property is required');
    let node: Node
    const internalKey = `_${propertyName}`;
    let desc: PropertyDescriptor = {
        get: function () {
            if (!isValid(node)) {
                node = new Node(clazz.name??'compSingleton');
                node.parent = director.getScene();
                this[internalKey] = node.addComponent(clazz);
            }
            return this[internalKey];
        },
        set: function (_: any) {
            throw new Error('set component singleton is forbidden');
        }
    }

    return desc as any;
}