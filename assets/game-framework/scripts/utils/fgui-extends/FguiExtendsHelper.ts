import { Node } from "cc";
import { GRoot, UIPackage } from "fairygui-cc";

export class GRootHelper {
    static create(rootParent: Node) {
        const groot = new GRoot();
        GRoot['_inst'] = groot;
        rootParent.addChild(groot.node);
        groot.onWinResize();
        return groot;
    }
}

export class UIPackageHelper {
    static removeAllPackage() {
        for (const name in UIPackage['_instByName'] as Record<string, UIPackage>)
            UIPackage.removePackage(name);
    }
}