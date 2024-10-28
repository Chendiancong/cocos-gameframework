import { screen, SubContextView, UITransform, view } from "cc";
import { aspects } from "../utils/Aspects";
import { supportVersions } from "./SupportVersions";

/**
 * minigame-canvas-engine中Layout的updateViewPort函数坐标原点为屏幕左上角，
 * 而SubContextView中的_updateSubContextView计算y坐标时是以屏幕左下角为原点的，只要SubContextView所在节点Y坐标不是0，点击就会不准。
 * 这个方法用于修复这个问题。
 */
function doit() {
    if (!aspects.checkEngineVersion(supportVersions._3_8_x))
        return;
    const clazz = SubContextView;
    const key = '_updateSubContextView';
    const _ = clazz.prototype[key];
    clazz.prototype[key] = function (this: SubContextView) {
        if (!this['_openDataContext'])
            return;

        // update subContextView size
        // use SHOW_ALL policy to adapt subContextView
        const nodeTrans = this.node.getComponent(UITransform) as UITransform;
        const contentTrans = this['_content'].getComponent(UITransform) as UITransform;

        const scaleX = nodeTrans.width / contentTrans.width;
        const scaleY = nodeTrans.height / contentTrans.height;
        const scale = scaleX > scaleY ? scaleY : scaleX;
        contentTrans.width *= scale;
        contentTrans.height *= scale;

        // update viewport in subContextView
        const viewportRect = view.getViewportRect();
        const box = contentTrans.getBoundingBoxToWorld();
        const visibleSize = view.getVisibleSize();
        const dpr = screen.devicePixelRatio;

        const x = (viewportRect.width * (box.x / visibleSize.width) + viewportRect.x) / dpr;
        const y = (viewportRect.height * ((visibleSize.height - box.height - box.y) / visibleSize.height) + viewportRect.y) / dpr;
        const width = viewportRect.width * (box.width / visibleSize.width) / dpr;
        const height = viewportRect.height * (box.height / visibleSize.height) / dpr;

        this['_openDataContext'].postMessage({
            fromEngine: true,
            type: 'engine',
            event: 'viewport',
            x, y,
            width, height
        });
    }
}

export const fixSubContextView = {
    doit,
}