import { EventTarget, js } from "cc";

const eventEmitter = new EventTarget();

function getEventEmitter(obj: any) {
    if (!obj)
        return eventEmitter;

    if (typeof obj.emit === "function")
        return obj;

    obj = obj.node;
    if (obj && typeof obj.emit === "function")
        return obj;

    return eventEmitter;
}

export class MessageCenter {

    public static setFunction(obj: any, name: string, prefix: string, className?: string): boolean {
        if (name.startsWith(prefix) && typeof obj[name] === "function") {
            let eventName = (className || js.getClassName(obj)) + "." + name;
            let fun: Function = obj[name];
            let newFun: any = function () {
                let res: any;
                res = fun.apply(this, arguments);
                if (res !== false) {
                    let emitter = getEventEmitter(this);
                    emitter.emit(eventName, res);
                }
                return res;
            }
            newFun.funcallname = eventName;
            obj[name] = newFun;
            return true;
        }

        return false;
    }

    public static compile(obj: any, prefix: string = "post") {
        let className = js.getClassName(obj);
        for (let key in obj)
            MessageCenter.setFunction(obj, key, prefix, className);
        
        let proto = obj && obj.prototype;
        if (!proto)
            return obj;
        
        for (let key of Object.getOwnPropertyNames(proto)) {
            MessageCenter.setFunction(proto, key, prefix, className);
        }

        return obj;
    }

    public static addListener(obj: any, func: Function, listener: Function, thiz?: any, once?: boolean)
    {
        let eventName: string = (<any>func).funcallname;
        let emitter = getEventEmitter(obj);
        if (once)
            return emitter.once(eventName, listener, thiz);
        return emitter.on(eventName, listener, thiz);
    }

    public static removeListener(obj: any, func: Function, listener: Function, thiz?: any)
    {
        let eventName: string = (<any>func).funcallname;
        let emitter = getEventEmitter(obj);
        emitter.off(eventName, listener, thiz);
    }
}

/** 让函数具有派发事件的能力 */
export function post(objOrClaz: any, name: string, property: PropertyDescriptor)
{
    let func = property.value;
    let eventName = js.getClassName(objOrClaz) + "." + name;
    let _func: any = function ()
    {
        let res: any = null;
        res = func.apply(this, arguments);
        if (res !== false) {
            let emitter = getEventEmitter(this);
            emitter.emit(eventName, res);
        }
        return res;
    }
    _func.funcallname = eventName;
    property.value = _func;
    return property;
}
