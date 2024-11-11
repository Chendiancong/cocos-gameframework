declare namespace FguiExtends {
    type FguiComponent = import('../../view/BaseComponent').BaseComponent;

    interface TransitionExtends {
        /** 播放缓动动画，返回动画完成的异步对象 */
        xPlay(...args: Parameters<import('fairygui-cc').Transition['play']>): Promise<import('fairygui-cc').Transition>;
    }

    interface GMovieClipExtends {
        /** 设置可见性并播放特定次数 */
        xShowAndPlay(playTimes: number): Promise<import('fairygui-cc').GMovieClip>;
    }

    interface GObjectExtends {
        get ccRenderClazz(): Constructor<FguiComponent>;
        set ccRenderClazz(val: Constructor<FguiComponent>);

        get ccRender(): FguiComponent;
        set ccRender(val: FguiComponent);

        xLocalToGlobal(ax?: number, ay?: number, result?: import('cc').Vec2): import('cc').Vec2;
        xGlobalToLocal(ax?: number, ay?: number, result?: import('cc').Vec2): import('cc').Vec2;
        addRenderer(clazz: Constructor<FguiComponent>, params?: Record<string, any>);
        makeFullScreen(): void;
        makeFullWithTarget(target: import('fairygui-cc').GObject): void;
    }

    interface GListExtends {
        get ccItemRenderClazz(): Constructor<FguiComponent>;
        set ccItemRenderClazz(val: Constructor<FguiComponent>);

        /** 给当前所有活动的item派发事件 */
        emitToItems(...args: Parameters<import('cc').Node['emit']>): void;
    }

    interface GComponentExtends {
        get isJobConstruct(): boolean;

        getChildByNames(names: string[]): import('fairygui-cc').GObject;
        addAsyncComponentRenderer(clazz: Constructor<FguiComponent>, params?: Record<string, any>);
    }

    interface GLoaderExtends {
        addContentRenderClazz(clazz: Constructor<FguiComponent>, params?: Record<string, any>);
        removeContentRenderClazzes(targetClazzs?: Constructor<FguiComponent>[]): void;
    }

    interface UIPackageExtends extends gFramework.IRefCountable { }
}

declare module 'fairygui-cc' {
    interface Transition extends FguiExtends.TransitionExtends {}
    interface GMovieClip extends FguiExtends.GMovieClipExtends {}
    interface GObject extends FguiExtends.GObjectExtends {}
    interface GList extends FguiExtends.GListExtends {}
    interface GComponent extends FguiExtends.GComponentExtends {}
    interface GLoader extends FguiExtends.GLoaderExtends {}
    interface UIPackage extends FguiExtends.UIPackageExtends {}
}