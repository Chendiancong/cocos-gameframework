import { EventTarget } from "cc";
import { debugUtil } from "../base/debugUtil";
import { arrayRemove } from "../base/jsUtil";

const DEFAULT_TIMEOUT = 3000;
const INIT_ID = 0;
const EVENT_CLOSED = "closed";
const EVENT_DRAINED = "drained";

export type QueueTask = {
    done: () => boolean;
}
export type TaskHandle = (task: QueueTask) => void;
export type TimeoutHandle = () => void;

export interface IQueue {
    push: (fn: TaskHandle, ontimeout?: TimeoutHandle, timeoutMs?: number) => void;
    close: (force: boolean) => void;
}

let uniqId = Date.now(); // 使用Date.now()作为初始值以确保唯一性，并避免全局变量

function getUniqId() {
    // 检查uniqId是否超出Number的安全范围
    if (uniqId >= Number.MAX_SAFE_INTEGER) {
        uniqId = Date.now(); // 重置为当前时间戳，确保数值不会溢出
    }
    const localUniqId = uniqId++;
    return localUniqId + 1;
}

export class SeqQueue extends EventTarget {

    /**
     * Queue status: idle, welcome new tasks
     */
    static STATUS_IDLE = 0;

    /**
     * Queue status: busy, queue is working for some tasks now
     */
    static STATUS_BUSY = 1;

    /**
     * Queue status: closed, queue has closed and would not receive task any more 
     * 					and is processing the remaining tasks now.
     */
    static STATUS_CLOSED = 2;

    /**
     * Queue status: drained, queue is ready to be destroy
     */
    static STATUS_DRAINED = 3;

    private static readonly _queues: Record<number|string, SeqQueue> = Object.create(null);

    status: number;
    queue: {
        id?: number;
        uniqId: number;
        fn: TaskHandle,
        ontimeout?: TimeoutHandle,
        timeout?: number;
    }[];

    curId: number;
    timerId: any;
    timeout: number;

    constructor(timeout: number) {
        super();
        if (timeout && timeout > 0) {
            this.timeout = timeout;
        } else {
            this.timeout = DEFAULT_TIMEOUT;
        }

        this.status = SeqQueue.STATUS_IDLE;
        this.curId = INIT_ID;
        this.queue = [];
    }

    /**
     * Add a task into queue.
     * 
     * @param fn new request
     * @param ontimeout callback when task timeout
     * @param timeout timeout for current request. take the global timeout if this is invalid
     * @returns uniqId of this task item
     */
    push(fn: TaskHandle, ontimeout?: TimeoutHandle, timeout?: number) {
        if (this.status !== SeqQueue.STATUS_IDLE && this.status !== SeqQueue.STATUS_BUSY) {
            return false;
        }

        if (typeof fn !== "function") {
            throw new Error("fn should be a function.");
        }

        const uniqId = getUniqId();
        this.queue.push({ fn: fn, ontimeout: ontimeout, timeout: timeout, uniqId: uniqId });

        if (this.status === SeqQueue.STATUS_IDLE) {
            this.status = SeqQueue.STATUS_BUSY;
            this.next(this.curId);
        }
        return uniqId;
    }

    /**
     * Remove a task
     * 
     * @param uniqId task uniq id
     * @return success or not
     */
    delete(uniqId: number) {
        const queue = this.queue;
        let isRemoved = false;
        for (let i = queue.length; --i >= 0; ) {
            if (queue[i].uniqId === uniqId) {
                queue[i] = void 0;
                isRemoved = true;
                break;
            }
        }
        if (isRemoved)
            arrayRemove(queue, void 0);
    }

    /**
     * Close queue
     * 
     * @param force if true will close the queue immediately else will execute the rest task in queue
     */
    close(force: boolean) {
        if (this.status !== SeqQueue.STATUS_IDLE && this.status !== SeqQueue.STATUS_BUSY) {
            return;
        }

        if (force) {
            this.status = SeqQueue.STATUS_DRAINED;
            if (this.timerId) {
                clearTimeout(this.timerId);
                this.timerId = undefined;
            }
        } else {
            this.status = SeqQueue.STATUS_CLOSED;
        }
    }

    private next(tid: number) {
        // let now = performance.now();
        // let delta = now - director. ._lastUpdate;
        // if (delta >= this.animationInterval)
        //     setTimeout(() => { this._next(tid) });
        // else

        Promise.resolve().then(() => { this._next(tid) });
    }

    /**
     * Invoke next task
     * 
     * @param tid last executed task id
     */
    private _next(tid: number) {
        if (tid !== this.curId || this.status !== SeqQueue.STATUS_BUSY && this.status !== SeqQueue.STATUS_CLOSED) {
            return;
        }

        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = undefined;
        }

        const queueItem = this.queue.shift();
        if (!queueItem) {
            if (this.status === SeqQueue.STATUS_BUSY) {
                this.status = SeqQueue.STATUS_IDLE;
                this.curId++;
            } else {
                this.status = SeqQueue.STATUS_DRAINED;
            }
            return;
        }

        queueItem.id = ++this.curId;

        let timeout = queueItem.timeout > 0 ? queueItem.timeout : this.timeout;
        timeout = timeout > 0 ? timeout : DEFAULT_TIMEOUT;

        this.timerId = setTimeout(() => {
            if (queueItem.ontimeout) {
                queueItem.ontimeout(); 
            }
            this.next(queueItem.id);
        }, timeout);


        try {
            queueItem.fn({
                done: () => {
                    let res = queueItem.id === this.curId;

                    this.next(queueItem.id);

                    return res;
                }
            });
        } catch (err) {
            debugUtil.error(err);
            this.next(queueItem.id);
        }
    }

    /**
     * get or create Sequence queue
     * 
     * @param key name of this queue
     * @param timeout a global timeout for the new queue instance
     * @returns SeqQueueManager
     */
    static getOrCreateQueue(key: number|string, timeout?: number) {
        let queue = this._queues[key];
        timeout = timeout ?? DEFAULT_TIMEOUT;
        if (!queue)
            queue = this._queues[key] = new SeqQueue(timeout);
        else
            queue.timeout = timeout;
        return queue;
    }

    /**
     * try to get a queue
     * @param key name of this queue
     * @returns 
     */
    static getQueue(key: number|string) {
        return this._queues[key];
    }

    /**
     * try to remove a queue
     * @param key name of this queue
     */
    static removeQueue(key: number|string) {
        delete this._queues[key];
    }
}

function _queueFunc(internalOption: {
    clazzOrProto: any,
    methodName: string,
    desc: PropertyDescriptor,
    timeoutMs: number,
    timeout?: TimeoutHandle,
    mergeSameCall?: boolean
}) {
    const {
        clazzOrProto,
        methodName,
        desc,
        timeoutMs,
        timeout,
        mergeSameCall,
    } = internalOption;
    const key = clazzOrProto.prototype ?
        clazzOrProto.prototype.constructor.name :
        clazzOrProto.constructor.name;
    if (!key) {
        console.trace('queue job error missing key');
        return;
    }

    const originFunc = desc.value as Function;
    desc.value = function () {
        const args = arguments;
        const queueUid = `_queueUid_${methodName}_${[...args]}`;
        const queue = SeqQueue.getOrCreateQueue(key);
        const that = this;
        const oldUniqId = this[queueUid];
        const fn = function (task: QueueTask) {
            const ret = originFunc.call(that, ...args);
            if (ret instanceof Promise)
                ret.then(() => {
                    delete that[queueUid];
                    task.done();
                });
            else {
                delete that[queueUid];
                task.done();
            }
        }
        if (mergeSameCall) {
            if (oldUniqId != void 0)
                queue.delete(oldUniqId);
            this[queueUid] = queue.push(fn, timeout, timeoutMs);
        } else
            queue.push(fn, timeout, timeoutMs);
    }
    return desc;
}

type QueueOption = {
    /** 延迟时间 */
    timeoutMs?: number,
    /** 延迟回调 */
    timeout?: TimeoutHandle,
    /** 延迟回调方法名称 */
    timeoutMethodName?: string,
    /** 是否合并相同的调用（函数名，参数相同则为相同的调用） */
    mergeSameCall?: boolean,
}
/**
 * 将函数队列化
 * @param queueOption
 * @returns 
 */
export function queueFunc(queueOption: QueueOption);
export function queueFunc(clazzOrProto: any, methodName: string, desc: PropertyDescriptor);
export function queueFunc(...args) {
    if (args.length == 1) {
        const option = args[0] as QueueOption;
        return function (clazzOrProto: any, methodName: string, desc: PropertyDescriptor) {
            return _queueFunc({
                clazzOrProto, methodName, desc,
                timeoutMs: option.timeoutMs,
                timeout: option.timeout ?? option.timeoutMethodName ? clazzOrProto[option.timeoutMethodName] : void 0,
                mergeSameCall: option.mergeSameCall
            });
        }
    } else {
        return _queueFunc({
            clazzOrProto: args[0], methodName: args[1], desc: args[2],
            timeoutMs: DEFAULT_TIMEOUT
        });
    }
}