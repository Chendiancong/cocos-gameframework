import { Component, isValid, _decorator } from "cc";
import { IDelegate, asDelegate } from "../base/Delegate";
import { UIPackage } from "fairygui-cc";

const { ccclass } = _decorator;

const EventType = {
    loaded: "fui.packageLoaded"
};

const enum LoadState {
    Init,
    Loading,
    Loaded
}

@ccclass
export class FPackage extends Component {
    static EventType = EventType;

    private _packageName: string;
    private _pkg: UIPackage;
    private _loadState = LoadState.Init;
    @asDelegate
    private _loadedHandler: IDelegate<(fpkg: UIPackage) => void>;

    get isLoading() { return this._loadState === LoadState.Loading; }
    get isLoaded() { return this._loadState === LoadState.Loaded; }

    protected onLoad() {
        // if (this.packageName) {
        //     gFramework.resMgr.loadFPkg(
        //         this.packageName,
        //         (err, pkg) => this.onLoaded(pkg)
        //     );
        // }
        // else
        //     this.onLoaded(null);
        this._loadPackage();
    }

    set packageName(name: string) {
        // // if (this._packageName === name && this._isLoaded)
        // //     return;
        // // this._isLoaded = false;
        // if (this._isLoaded)
        // if (this.packageName)
        //     gFramework.resMgr.loadFPkg(
        //         this.packageName,
        //         (err, pkg) => this.onLoaded(pkg)
        //     );
        // else
        //     this.onLoaded(null);
        gFramework.assert(!this.packageName);
        this._packageName = name;
        this._loadPackage();
    }

    get packageName() {
        return this._packageName;
    }

    setLoadedHandler(handler: (pkg: UIPackage) => void, that?: any) {
        if (this.isLoaded)
            handler(this._pkg);
        else
            this._loadedHandler.addOnce(handler, that);
    }

    onDestroy() {
        if (this._pkg) {
            this._pkg.decRef();
            this._pkg = null;
        }
        this._loadState = LoadState.Init;
    }

    private _onPackageLoaded(pkg: UIPackage) {
        if (isValid(this)) {
            if (pkg) {
                this._pkg = pkg.addRef();
                this._loadState = LoadState.Loaded;
            }
            this.node.emit(EventType.loaded, this.packageName);
            if (this._pkg) {
                try {
                    this._loadedHandler.entry(this._pkg);
                } catch (e) {

                } finally {
                    this._loadedHandler.clear();
                }
            }
        } else {
            if (pkg)
                pkg.decRef();
        }
    }

    private _loadPackage() {
        if (this._loadState !== LoadState.Init)
            return;
        if (!this.packageName) {
            this._onPackageLoaded(null);
            return;
        }
        this._loadState = LoadState.Loading;
        gFramework.resMgr.legacy_loadFPkg(
            this.packageName,
            (err, pkg) => this._onPackageLoaded(pkg)
        );
    }
}