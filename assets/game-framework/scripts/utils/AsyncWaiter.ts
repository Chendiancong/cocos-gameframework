import { defer } from "../base/promise";

export class AsyncWaiter {
    private _waiters: Map<string, gFramework.PromiseDefer<any>> = new Map();
    private _stableWaiters: Map<string, gFramework.PromiseDefer<any>> = new Map();

    /**
     * 建立一个异步等待
     * @param key 异步等待标记
     * @param stable 是否持久化
     */
    createTag(key: string, stable: boolean = false) {
        const waiters = stable ? this._stableWaiters : this._waiters;
        if (!waiters.has(key))
            waiters.set(key, defer<any>());
    }

    /**
     * 进行异步等待
     * @param key 异步等待标记
     */
    wait<T = any>(key: string): Promise<T> {
        if (this._waiters.has(key))
            return this._waiters.get(key).promise;
        if (this._stableWaiters.has(key))
            return this._stableWaiters.get(key).promise;
        return Promise.resolve(0) as Promise<T>;
    }

    /**
     * 完成一个异步等待
     * @param key 异步等待标记
     * @param data 完成参数
     */
    complete<T = any>(key: string, data?: T) {
        let waiters = this._stableWaiters;
        if (waiters.has(key)) {
            const waiter = waiters.get(key);
            if (waiter["_resolved"])
                throw new Error(`waiter ${key} has been resolved`);
            waiter["_resolved"] = true;
            waiter.resolve(data);
        }
        waiters = this._waiters;
        if (waiters.has(key)) {
            waiters.get(key).resolve(data);
            waiters.delete(key);
        }
    }
}