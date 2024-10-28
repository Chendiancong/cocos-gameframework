import { fgui } from "../../base/base";
import { ComplexValue } from "../complex/ComplexValue";

let queue1: fgui.GComponent[] = [];
let queue2: fgui.GComponent[] = [];
function fGetChildRecursively(fcomp: fgui.GComponent, name: string) {
    if (!fcomp)
        return null;
    queue1[0] = fcomp;
    let i: number, il: number;
    let j: number, jl: number;
    let comp: fgui.GComponent;
    let comp2: fgui.GComponent;
    while (queue1.length) {
        for (i = 0, il = queue1.length; i < il; i++) {
            comp = queue1[i];
            if (comp._children) {
                if (comp2 = (comp.getChild(name) as fgui.GComponent)) {
                    queue1.length = queue2.length = 0;
                    return comp2;
                }

                queue2.push(...(comp._children as fgui.GComponent[]));
            }
        }

        let tmp = queue1;
        tmp.length = 0;
        queue1 = queue2;
        queue2 = tmp;
    }

    queue1.length = queue2.length = 0;
    return null;
}

export function fGetChild(fcomp: fgui.GComponent, path: string | string[]) {
    if (Array.isArray(path)) {
        let i = 0;
        while (i < path.length) {
            fcomp = fGetChildRecursively(fcomp, path[i++]);
            if (!fcomp) {
                break;
            }
        }
        return fcomp;
    } else {
        let res = fGetChildRecursively(fcomp, path);
        if (!res) {
            return;
        }
        return res.asCom;
    }
}

export function setVisible(fobj: fgui.GObject & { hidenValue?: ComplexValue }, visible: boolean, hidenKey?: string, onlyKey?: boolean) {
    if (hidenKey != void 0) {
        if (onlyKey) {
            fobj.hidenValue = new ComplexValue();
        } else {
            if (!fobj.hidenValue)
                fobj.hidenValue = new ComplexValue();
        }
        fobj.hidenValue.set(hidenKey, visible);
    }

    if (fobj.hidenValue && fobj.hidenValue.hasFalse())
        fobj.visible = false;
    else
        fobj.visible = visible;
}

export function setGray(fobj: fgui.GObject, gray: boolean = true) {
    fobj.grayed = gray;
}

export function createFullView(parent: fgui.GComponent): fgui.GComponent {
    let res = new fgui.GComponent();
    res.makeFullScreen();
    res.addRelation(parent, fgui.RelationType.Size);
    parent.addChild(res);
    return res;
}

export function createCenterView(parent: fgui.GComponent): fgui.GComponent {
    let res = new fgui.GComponent();
    res.addRelation(parent, fgui.RelationType.Center_Center);
    parent.addChild(res);
    res.center();
    return res;
}

export function createFullMask() {
    return gFramework.viewMgr.createObject("Common", "Mask").asCom;
}



