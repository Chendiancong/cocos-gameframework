import { UITransform, screen, view } from "cc";
import { PoolManager } from "game-framework/scripts/base/ObjectPool";
import { PooledRect } from "../math/PooledCCValues";
import { applyMixins } from "game-framework/scripts/base/jsUtil";

export class UITransformExtends implements CCExtends.UITransformExtends {
    xGetLeftX(this: UITransform, isWorldPos?: boolean): number {
        const x = isWorldPos ?
            this.node.worldPosition.x :
            this.node.position.x;
        const width = this.width * this.node.scale.x;
        return x - width * this.anchorX;
    }

    xGetRightX(this: UITransform, isWorldPos?: boolean): number {
        return this.xGetLeftX(isWorldPos) + this.width * this.node.scale.x;
    }

    xGetBottomY(this: UITransform, isWorldPos?: boolean): number {
        const y = isWorldPos ?
            this.node.worldPosition.y :
            this.node.position.y;
        const height = this.height * this.node.scale.y;
        return y - height * this.anchorY;
    }

    xGetTopY(this: UITransform, isWorldPos?: boolean): number {
        return this.xGetBottomY(isWorldPos) + this.height * this.node.scale.y;
    }

    xGetCenterX(this: UITransform, isWorldPos?: boolean): number {
        const x = isWorldPos ?
            this.node.worldPosition.x :
            this.node.position.x;
        return x + (0.5 - this.anchorX) * this.width * this.node.scale.x;
    }

    xGetCenterY(this: UITransform, isWorldPos?: boolean): number {
        const y = isWorldPos ?
            this.node.worldPosition.y :
            this.node.position.y;
        return y + (0.5 - this.anchorY) * this.height * this.node.scale.y;
    }

    xGetAnchorOffsetX(this: UITransform): number {
        return this.width * this.node.scale.x * this.anchorX;
    }

    xGetAnchorOffsetY(this: UITransform): number {
        return this.height * this.node.scale.y * this.anchorY;
    }

    xIsInsideScreen(this: UITransform): boolean {
        const myRect = PoolManager.getItem(PooledRect);
        const screenRect = PoolManager.getItem(PooledRect);
        this['_selfBoundingBox'](myRect);
        myRect.transformMat4(this.node.worldMatrix);

        const windowSize = screen.windowSize;
        screenRect.set(0, 0, windowSize.width / view.getScaleX(), windowSize.height / view.getScaleY());

        const ret = screenRect.containsRect(myRect) || screenRect.intersects(myRect);
        PoolManager.pushItem(myRect);
        PoolManager.pushItem(screenRect);
        return ret;
    }
}

applyMixins(UITransform, [UITransformExtends]);