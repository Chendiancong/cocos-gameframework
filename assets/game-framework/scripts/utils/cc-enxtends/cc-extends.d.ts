declare namespace CCExtends {
    interface AnimationExtends {
        /** 获取动画剪辑的长度 */
        getDuration(clipName: string): number;
        /** 获取动画剪辑的未缩放的长度 */
        getUnscaledDuration(clipName: string): number;
        /** 播放一次动画 */
        playOneTime(clipName: string): Promise<import('cc').Animation>
    }

    interface NodeExtends {
        /** 设置统一缩放 */
        xSetScale(scale: number): void;
        /** 设置统一的世界缩放 */
        xSetWorldScale(scale: number): void;
        /** 通过layer设置可见性 */
        xSoftSetVisible(flag: boolean): void;
    }

    interface UITransformExtends {
        /** 获取左边界x坐标 */
        xGetLeftX(isWorldPos?: boolean): number;
        /** 获取右边界x坐标 */
        xGetRightX(isWorldPos?: boolean): number;
        /** 获取下边界y坐标 */
        xGetBottomY(isWorldPos?: boolean): number;
        /** 获取上边界y坐标 */
        xGetTopY(isWorldPos?: boolean): number;
        /** 获取中心点x坐标 */
        xGetCenterX(isWorldPos?: boolean): number;
        /** 获取中心点y坐标 */
        xGetCenterY(isWorldPos?: boolean): number;
        /** 锚点距离左边界的距离 */
        xGetAnchorOffsetX(): number;
        /** 锚点距离下边界的距离 */
        xGetAnchorOffsetY(): number;
        /** 是否位于屏幕内 */
        xIsInsideScreen(): boolean;
    }
}

declare module 'cc' {
    interface Animation extends CCExtends.AnimationExtends { }
    interface Node extends CCExtends.NodeExtends { }
    interface UITransform extends CCExtends.UITransformExtends { }
}