export function defer<T>(): gFramework.PromiseDefer<T> {
    let resolve: (param: T) => void, reject;
    let promise = new Promise<T>(function () {
        resolve = arguments[0];
        reject = arguments[1];
    });

    return {
        promise: promise,
        resolve: resolve,
        reject: reject
    }
}

export function promisify(fn: Function) {
    return function (...args) {
        return new Promise<any>((resolve, reject) => {
            function customCallback(err, ...results) {
                if (err) {
                    return reject(err);
                }
                return resolve(results.length === 1 ? results[0] : results);
            }
            args.push(customCallback);
            fn.apply(this, args);
        });
    }
}

export function sequence(values: Array<any>): Promise<any> {
    return values.reduce(function (p: Promise<any>, value: any) {
        if ("function" === typeof value)
            return p.then(() => value());
        else
            return p.then(() => value);
    }, Promise.resolve());
}

export function parallel(values: Array<Promise<any> | Function>) {
    return Promise.all(values.map(value => {
        if ("function" === typeof value)
            return value();
        else
            return value;
    }));
}

export function promiseDelay(timeSec: number) {
    const d = defer<void>();
    setTimeout(d.resolve, timeSec*1000);
    return d.promise;
}

export class DeferCenter<TRet = any, TKey extends string = string> {
    private _defers: Record<string, gFramework.PromiseDefer<TRet>> = {};
    private _status: Record<string, 0|1|2> = {};

    resolve(key: TKey, data?: TRet) {
        const status = this._status[key];
        if (status == void 0 || status == 0) {
            this._status[key] = 1;
            this._internalGet(key).resolve(data);
        }
    }

    reject(key: TKey, errOrMsg?: any) {
        const status = this._status[key];
        if (status == void 0 || status == 0) {
            this._status[key] = 2;
            this._internalGet(key).reject(errOrMsg);
        }
    }

    delete(key: TKey) {
        if (this._defers[key])
            this._defers[key].reject('delete');
        delete this._defers[key];
        delete this._status[key];
    }

    clear() {
        for (const k in this._defers)
            this._defers[k].reject('delete');
        this._defers = {};
        this._status = {};
    }

    get(key: TKey) { return this._internalGet(key); }

    getPromise(key: TKey) { return this._internalGet(key).promise; }

    /**
     * 0：未完成,
     * 1：已完成,
     * 2：已拒绝,
     */
    getStatus(key: TKey) {
        return this._status[key] ?? 0;
    }

    reset(key: TKey, forceReset: boolean = false) {
        if (forceReset)
            return this._internalCreate(key);
        if (!(key in this._defers))
            return this._internalGet(key);
        const status = this._status[key];
        if (status == void 0 || status == 0)
            return this._internalGet(key);
        return this._internalCreate(key);
    }

    unsafeReset(key: TKey) {
        this.reject(key, 'cancel');
        this.reset(key);
    }

    private _internalGet(key: string) {
        let d = this._defers[key];
        if (!d)
            d = this._internalCreate(key);
        return d;
    }

    private _internalCreate(key: string) {
        let d = this._defers[key] = defer<TRet>();
        this._status[key] = 0;
        return d;
    }
}