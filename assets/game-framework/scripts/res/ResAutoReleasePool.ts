export class ResAutoReleasePool {

    private _assetMap: { [url: string]: gFramework.IRefCountable } = Object.create(null);

    get assetMap() {
        return this._assetMap;
    }

    add(asset: gFramework.IRefCountable, url: string) {
        let map = this._assetMap;
        if (!map[url]) {
            asset.addRef();
            map[url] = asset;
        }
    }

    tryRelease(asset: gFramework.IRefCountable, url: string) {
        if (asset.refCount <= 1) {
            asset.decRef();
            this._assetMap[url] = null;
        }
    }

    reset() {
        for (let url in this._assetMap) {
            this.tryRelease(this._assetMap[url], url);
        }
        this._assetMap = Object.create(null);
    }

    free() {
        let map = this._assetMap;
        for (let url in map) {
            if (map[url] != null)
                this.tryRelease(map[url], url);
        }
    }

}
