import { BitMask, Layers, ModelRenderer, Node, UIRenderer } from "cc";
import { applyMixins } from "game-framework/scripts/base/jsUtil";

type MixNode = Node&NodeExtends

const kOriginLayerKey = '$originLayer';
const kModelRendererKey = '$modelRenderer';
const kUIRendererKey = '$uiRenderer';

export class NodeExtends implements CCExtends.NodeExtends {
    xSetScale(this: MixNode, scale: number) {
        this.setScale(scale, scale, scale);
    }

    xSetWorldScale(this: MixNode, scale: number) {
        this.setWorldScale(scale, scale, scale);
    }

    xSoftSetVisible(this: MixNode, flag: boolean) {
        if (this['_xSoftVisible'] === flag)
            return;
        this['_xSoftVisible'] = flag;
        if (flag)
            this.walk(this._xInnerSoftSetVisible);
        else
            this.walk(this._xInnerSoftSetUnvisible);
    }

    private _xInnerSoftSetVisible(n: MixNode) {
        const targetLayer = n[kOriginLayerKey];
        if (typeof targetLayer === 'number') {
            const modelRenderer = n._xGetModelRenderer();
            if (modelRenderer?.isValid) {
                n.layer = targetLayer;
                modelRenderer.visibility = targetLayer;
            } else {
                const uiRenderer = n._xGetUIRenderer();
                if (uiRenderer?.isValid)
                    n.layer = targetLayer;
            }
            delete n[kOriginLayerKey];
        }
    }

    private _xInnerSoftSetUnvisible(n: MixNode) {
        n[kOriginLayerKey] = n.layer;
        const targetLayer = Layers.BitMask['HIDE'];
        const modelRenderer = n._xGetModelRenderer();
        if (modelRenderer?.isValid) {
            n.layer = targetLayer;
            modelRenderer.visibility = targetLayer;
        } else {
            const uiRenderer = n._xGetUIRenderer();
            if (uiRenderer?.isValid)
                n.layer = targetLayer;
        }
    }

    private _xGetModelRenderer(this: MixNode): ModelRenderer {
        return this[kModelRendererKey] !== void 0 ?
            this[kModelRendererKey] :
            (this[kModelRendererKey] = this.getComponent(ModelRenderer) ?? null);
    }

    private _xGetUIRenderer(this: MixNode): UIRenderer {
        return this[kUIRendererKey] !== void 0 ?
            this[kUIRendererKey] :
            (this[kUIRendererKey] = this.getComponent(UIRenderer) ?? null);
    }
}

applyMixins(Node, [NodeExtends]);