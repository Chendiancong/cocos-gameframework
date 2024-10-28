import { GLoader, MyEvent, RelationType } from "fairygui-cc";
import { BaseComponent, ComponentData } from "./BaseComponent";
import { FPackage } from "./FPackage";
import { js } from "cc";
import { DeferCenter } from "../base/promise";

export class XGLoader extends BaseComponent {
    private _pkgs: Record<string, FPackage> = {};
    private _subViews: Record<string, SubView> = {};
    private _curView: SubView;

    get loader() { return this.fobj as GLoader; }

    async setView<T extends BaseComponent>(packName: string, viewName: string, compCtor: Constructor<T>, data?: ComponentData<T>): Promise<void> {
        gFramework.assert(this.loader instanceof GLoader);
        let viewOk = true;
        do {
            if (this._curView?.isMe(packName, viewName, compCtor))
                break;
            const nextView = this._getSubView(packName, viewName, compCtor);
            await this._loadPackage(packName);
            if (!nextView.isMe(packName, viewName, compCtor)) {
                viewOk = false;
                break;
            }
            await nextView.build();
            this._switchView(nextView);
        } while (false);

        if (viewOk)
            this._curView.setData(data);
    }

    preload(packName: string) {
        this._loadPackage(packName);
    }

    private async _loadPackage(packName: string) {
        let curPkg = this._pkgs[packName];
        if (!curPkg?.isValid) {
            curPkg = this.addComponent(FPackage);
            this._pkgs[packName] = curPkg;
            curPkg.packageName = packName;
        }

        await new Promise<void>(resolve => curPkg.setLoadedHandler(() => resolve()));
    }

    private _switchView(nextView: SubView) {
        if (this._curView?.equals(nextView)) {
            this._curView?.show();
            return;
        }
        this._curView?.hide();
        this._curView = nextView;
        nextView?.show();
        this.loader['_content2'] = nextView.inner;
    }

    private _getSubView(packName: string, viewName: string, compCtor: Constructor<BaseComponent>) {
        const key = XGLoader.convert2SubViewKey(packName, viewName, compCtor);
        let subView = this._subViews[key];
        if (!subView)
            subView = this._subViews[key] = new SubView(this, packName, viewName, compCtor);
        return subView;
    }

    static convert2SubViewKey(packName: string, viewName: string, compCtor: Constructor<BaseComponent>) {
        return `${packName}_${viewName}_${js.getClassName(compCtor)}`;
    }
}

class SubView {
    private _root: XGLoader;
    private _inner: GLoader;
    private _packName: string;
    private _viewName: string;
    private _ccCompCtor: Constructor<BaseComponent>;
    private _inited: boolean;
    private _defers = new DeferCenter<void, 'innerLoaded'>();

    get loadingTask() { return this._defers.getPromise('innerLoaded'); }
    get subViewKey() { return XGLoader.convert2SubViewKey(this._packName, this._viewName, this._ccCompCtor); }
    get inner() { return this._inner; }

    constructor(root: XGLoader, packName: string, viewName: string, ccCompCtor: Constructor<BaseComponent>) {
        this._root = root;
        this._packName = packName;
        this._viewName = viewName;
        this._ccCompCtor = ccCompCtor;
        const inner = this._inner = new GLoader();
        inner.touchable = true;
        inner.node.name = XGLoader.convert2SubViewKey(packName, viewName, ccCompCtor);
        inner.node.parent = this._root.node;
        inner.x = inner.y = 0;
        inner.width = this._root.loader.width;
        inner.height = this._root.loader.height;
        inner.relations.add(this._root.loader, RelationType.Width);
        inner.relations.add(this._root.loader, RelationType.Height);
    }

    show() {
        this._inner.node.active = true;
    }

    hide() {
        this._inner.node.active = false;
    }

    isMe(packName: string, viewName: string, ccCompCtor: Constructor<BaseComponent>) {
        return this._packName === packName &&
            this._viewName === viewName &&
            this._ccCompCtor === ccCompCtor;
    }

    equals(other: SubView) {
        return this.isMe(other?._packName, other?._viewName, other?._ccCompCtor);
    }

    build() {
        if (!this._inited) {
            this._inited = true;
            this._inner.url = gFramework.viewMgr.getItemURL(this._packName, this._viewName);
            this._inner.addContentRenderer(this._ccCompCtor);
            if (this._inner.loaded)
                this._defers.resolve('innerLoaded');
            else
                this._inner.node.once(
                    MyEvent.LOADED,
                    () => {
                        this._defers.resolve('innerLoaded');
                    }
                );
        }
        return this._defers.getPromise('innerLoaded');
    }

    setData(data: any) {
        this._inner.data = data;
    }
}