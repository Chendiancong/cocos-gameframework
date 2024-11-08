import { GComponent, GList, GLoader, GObject, UIPackage } from "fairygui-cc";
import { isExtends, xInstanceOf } from "../base/jsUtil";
import type { BaseComponent } from "./BaseComponent";
import { Node, Component, js } from "cc";
import { getOrAddComponent } from "../utils/util";
import { NodeBatchable } from "../engine";
import { ResKeeper } from "../res/ResKeeper";
import { FPackage } from "./FPackage";
import { BaseComponentStart } from "./BaseComponentStart";
import { fGetChild } from "../utils/fgui/futil";
import { debugUtil } from "../base/debugUtil";

export type FPropHandleContext<TChild extends GObject = GObject> = {
    readonly instance: any;
    readonly ccNode: Node;
    readonly fcom: GComponent;
    fchild: TChild;
    fprop: IFProp;
    propName: string;
}

export interface IFguiCompHandler<T extends ViewDef.ViewComp = ViewDef.ViewComp> {
    onConvert(targetType: Constructor<T>): Constructor<BaseComponent>|undefined;
    onFix(targetType: Constructor<T>)
}

export class FPropUtil {
    private _compHandlers = new Map<Constructor, IFguiCompHandler>();

    fctrl({ instance, propName, fcom }: FPropHandleContext) {
        instance[propName] = fcom.getController(propName);
    }

    fanim({ instance, propName, fcom }: FPropHandleContext) {
        instance[propName] = fcom.getTransition(propName);
    }

    ftype({ instance, fprop, fchild, propName }: FPropHandleContext) {
        this.setCCRenderer(fchild, fprop.type);

        const comp = fchild.ccRender as Component;
        const params = fprop.params;
        if (!!params)
            Object.keys(params)
                .forEach(key => comp[key] = params[key]);
        comp.node.name = propName;
        instance[propName] = comp;
    }

    fprop({ instance, fchild, propName }: FPropHandleContext) {
        fchild.node.name = propName;
        instance[propName] = fchild;
    }

    fbatch({ fchild }: FPropHandleContext) {
        let node = fchild.node;
        if (fchild instanceof GList)
            node = fchild._container;
        if (node?.isValid)
            getOrAddComponent(node, NodeBatchable);
    }

    fpreventBatch({ fchild }: FPropHandleContext) {
        const node = fchild.node;
        NodeBatchable.setPreventBatchNode(node);
    }

    floader({ fprop, fchild: _fchild, instance }: FPropHandleContext) {
        const loader = fprop.loader;
        const packageName = loader.packageName;
        const itemName = loader.itemName;
        const fchild = _fchild as GLoader;
        this.setCCRenderer(fchild, loader.type);
        if (packageName && itemName) {
            if (UIPackage.getByName(packageName)) {
                ResKeeper.register(
                    fchild.node,
                    UIPackage.getByName(packageName)
                );
                fchild.url = gFramework.viewMgr.getItemURL(packageName, itemName);
            }
        } else {
            const pkg = getOrAddComponent(fchild.node, FPackage);
            pkg.packageName = packageName;
            pkg.node.once(
                FPackage.EventType.loaded,
                function () {
                    (fchild as GLoader).url = gFramework.viewMgr.getItemURL(packageName, itemName);
                },
                instance
            );
        }
    }

    fcomp({ fchild, fprop }: FPropHandleContext) {
        const isLoader = fchild instanceof GLoader;
        const isJobConstruct = fchild instanceof GComponent && fchild.isJobConstruct;
        for (const e of fprop.comp) {
            if (isLoader)
                this.addContentRenderer(fchild as GLoader, e.comp, e.params);
            else if (isJobConstruct)
                this.addAsyncComponentRenderer(fchild as GComponent, e.comp, e.params);
            else
                this.addRenderer(fchild, e.comp, e.params);
        }
    }

    fvirtual({ fchild }: FPropHandleContext<GList>) {
        fchild.setVirtual();
    }

    flistRenderer({ fchild, fprop }: FPropHandleContext<GList>) {
        this.setItemRenderer(fchild, fprop.list.itemRenderer);
    }

    initHandle({ fchild, fprop, ccNode }: FPropHandleContext) {
        getOrAddComponent(ccNode, BaseComponentStart)
            .initHandlers
                .push(fprop.initHandle.bind(void 0, fchild, fprop));
    }

    findChild({ instance, fprop, fcom }: Omit<FPropHandleContext, 'fchild'>) {
        let fchild: GObject;

        if (!!fprop.names)
            // 按名字列表获取属性
            fchild = fcom.getChildByNames(fprop.names);

        if (!fchild) {
            // 递归获取属性
            fchild = fGetChild(fcom, fprop.name);
            if (fchild) {
                // 记录属性名字列表
                let tempChild = fchild;
                const names = fprop.names = [];
                do {
                    names.push(tempChild.name);
                    tempChild = tempChild.parent;
                } while (tempChild !== fcom);
                names.reverse();
            }
        }

        if (!fchild) {
            if (fprop.required !== false)
                console.error(`can not found ${fprop.path || fprop.name} at ${js.getClassName(instance)}`);
        }

        return fchild;
    }

    initHelper(context: FPropHandleContext) {
        const fprop = context.fprop;
        do {
            if (fprop.ctrl) {
                this.fctrl(context);
                break;
            }

            if (fprop.anim) {
                this.fanim(context);
                break;
            }

            context.fchild = this.findChild(context);
            if (!context.fchild)
                break;

            if (fprop.type)
                this.ftype(context);
            else
                this.fprop(context);

            if (fprop.batch)
                this.fbatch(context);
            if (fprop.preventBatch)
                this.fpreventBatch(context);

            if (fprop.loader && xInstanceOf(context.fchild, GLoader))
                this.floader(context);
            if (fprop.comp)
                this.fcomp(context);

            if (xInstanceOf(context.fchild, GList)) {
                const _context = context as FPropHandleContext<GList>;
                if (fprop.list?.virtual)
                    this.fvirtual(_context);
                if (fprop.list?.itemRenderer)
                    this.flistRenderer(_context);
            }

            if (fprop.initHandle)
                this.initHandle(context);
        } while (false);
    }

    setCCRenderer(gobj: GObject, type: ViewDef.ViewCompType) {
        const _type = type.convertAsComponent();
        debugUtil.assert(!!_type);
        gobj.ccRenderClazz = _type;
    }

    addRenderer(gobj: GObject, type: ViewDef.ViewCompType, params?: any) {
        const _type = type.convertAsComponent();
        debugUtil.assert(!!_type);
        gobj.addRenderer(_type, params);
    }

    addContentRenderer(gobj: GLoader, type: ViewDef.ViewCompType, params?: any) {
        const _type = type.convertAsComponent();
        debugUtil.assert(!!_type);
        gobj.addContentRenderClazz(_type);
    }

    addAsyncComponentRenderer(gobj: GComponent, type: ViewDef.ViewCompType, params?: any) {
        const _type = type.convertAsComponent();
        debugUtil.assert(!!_type);
        gobj.addAsyncComponentRenderer(_type, params);
    }

    setItemRenderer(glist: GList, type: ViewDef.ViewCompType) {
        const _type = type.convertAsComponent();
        debugUtil.assert(!!_type);
        glist.ccItemRenderClazz = _type;
    }
}

export const fpropUtil = new FPropUtil();