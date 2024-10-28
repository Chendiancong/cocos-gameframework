export class Indirector<T> {
    private _target: T;

    get target() { return this._target; }

    constructor(target: T) {
        this._target = target;
    }

    invoke<K extends KeysWithType<T, Function>>(key: K, ...args: T[K] extends (...args) => any ? Parameters<T[K]> : never): T[K] extends (...args) => void ? ReturnType<T[K]> : any {
        return (this._target[key] as Function).call(this._target, ...args);
    }

    get<K extends keyof T>(key: K): T[K] { return this._target[key]; }

    set<K extends keyof T>(key: K, val: T[K]) { return this._target[key] = val; }
}