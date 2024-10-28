import { ObjectPool } from "../base/ObjectPool";
import { LoadParticlePlayer } from "./LoadParticlePlayer"

export const particlePlayerMgr = new class ParticlePlayerMgr {
    private readonly _playerPools = new Map<string, ObjectPool<LoadParticlePlayer>>();

    getItem(url: string) {
        const pool = this._getPool(url);
        const item = pool.getItem();
        return item;
    }

    pushItem(item: LoadParticlePlayer) {
        this._getPool(item.url).pushItem(item);
    }

    newOne(url: string) {
        return new LoadParticlePlayer(url);
    }

    private _getPool(url: string) {
        let pool = this._playerPools.get(url);
        if (!pool)
            this._playerPools.set(
                url,
                pool = ObjectPool.create({
                    ctor: () => this.newOne(url)
                })
        );
        return pool;
    }
}