import { js } from "cc";
import { BaseSystem } from "./BaseSystem";
import { parallel } from "./promise";

export interface ISystemRegisterInfo {
    clazz?: Constructor<BaseSystem>;
    className: string;
    /** system优先级，值越小优先级越高
     * 暂时设定: 如果配置了priority，调用时机出在进游戏之前初始化，否则在游戏进入主场景后初始化。
     */
    priority?: number;
}

export interface ISystemMgrHook {
    /** model初始化时 */
    onModelInit(modelIns: BaseSystem): void;
    /** model重连时 */
    onModelReconnect(modelIns: BaseSystem): void;
}

class SystemMgr {
    private _regInfo: { [index: string]: ISystemRegisterInfo } = {};
    private _instances: BaseSystem[] = [];
    private _hooks: ISystemMgrHook[] = [];
    reg(params: ISystemRegisterInfo) {
        if (params.priority == null) params.priority = 1000;
        this._regInfo[params.className] = params;
    }

    get instances() {
        return this._instances;
    }

    prepare() {
        const instances = this._instances;
        for (let key in this._regInfo) {
            const instance = this.instantiate(this._regInfo[key]);
            let i = instances.length;
            instances.push(instance);
            while (i > 0 && instances[i - 1]._priority > instance._priority) {
                instances[i] = instances[i - 1];
                i--;
            }
            instances[i] = instance;
        }
    }

    instantiate(info: ISystemRegisterInfo) {
        const res = new info.clazz();
        res._priority = info.priority;
        res.name = varName(info.className);
        _global[varName(info.className)] = res;
        return res;
    }

    async preInit() {
        let preInits = [];
        for (let instance of this._instances) {
            if (!!instance.preInit) preInits.push(instance.preInit.bind(instance));
        }
        await parallel(preInits);
    }

    private _delayInitInstances: BaseSystem[];
    init() {
        this._delayInitInstances = [];
        for (let instance of this._instances) {
            if (!!instance.init) {
                if (instance._priority <= 100) {
                    instance.init();
                    this._callHook('onModelInit', instance);
                    instance._inited = true; 
                }  
            } else {
                instance._inited = true;
            }
            if (!instance._inited) {
                this._delayInitInstances.push(instance);
            }
        }
    }

    private _init: boolean;
    callDelayInit() {
        if (this._init) return;
        if (this._delayInitInstances && this._delayInitInstances.length) {
            this._delayInitInstances.forEach(instance => {
                instance.init();
                this._callHook('onModelInit', instance);
                instance._inited = true;
            });
            this._init = true;
        }
    }

    reconnect() {
        for (let instance of this._instances) {
            this._callHook('onModelReconnect', instance);
            if (!!instance.reconnect) {
                instance.reconnect();
            }
        }
    }

    onRestart() {
        this.reset();
    }

    reset() {
        let instances = this._instances;
        for (let instance of instances) {
            _global[varName(js.getClassName(instance))] = null;
            instance.dispose();
        }
        instances.length = 0;
    }

    installHook(hook: ISystemMgrHook) {
        if (!this._hooks.includes(hook))
            this._hooks.push(hook);
    }

    private _callHook<K extends keyof ISystemMgrHook>(key: K, ...args: Parameters<ISystemMgrHook[K]>) {
        for (let i = 0, len = this._hooks.length; i < len; ++i) {
            const hook = this._hooks[i];
            const f = hook[key];
            if (f != void 0)
                f.call(hook, ...args);
        }
    }
}


function varName(className: string) {
    return className[0].toLocaleLowerCase() + className.slice(1);
}

const _global: any =
    typeof window === "object"
        ? window
        : typeof self === "object"
            ? self
            : this;

export const systemMgr = new SystemMgr();
