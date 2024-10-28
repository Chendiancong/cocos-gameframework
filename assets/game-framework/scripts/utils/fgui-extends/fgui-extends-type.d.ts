declare namespace FguiExtends {
    interface TransitionExtends {
        /** 播放缓动动画，返回动画完成的异步对象 */
        xPlay(...args: Parameters<import('fairygui-cc').Transition['play']>): Promise<import('fairygui-cc').Transition>;
    }

    interface GMovieClipExtends {
        /** 设置可见性并播放特定次数 */
        xShowAndPlay(playTimes: number): Promise<import('fairygui-cc').GMovieClip>;
    }

    interface GObjectExtends {
        xLocalToGlobal(ax?: number, ay?: number, result?: import('cc').Vec2): import('cc').Vec2;
        xGlobalToLocal(ax?: number, ay?: number, result?: import('cc').Vec2): import('cc').Vec2;
    }

    interface GListExtends {
        /** 给当前所有活动的item派发事件 */
        emitToItems(...args: Parameters<import('cc').Node['emit']>): void;
    }
}

declare module 'fairygui-cc' {
    interface Transition extends FguiExtends.TransitionExtends {}
    interface GMovieClip extends FguiExtends.GMovieClipExtends {}
    interface GObject extends FguiExtends.GObjectExtends {}
    interface GList extends FguiExtends.GObjectExtends {}
}