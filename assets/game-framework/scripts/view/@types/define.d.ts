
/** 窗口大小*/
declare enum kUiSize {
    none,
    normal,
    full,
    mixFull, //通用页签全屏
}


/** 窗口对齐*/
declare enum kUiAlign {
    center,
    leftCenter,
}

/** 窗口打开参数*/
declare enum kUiParam {
    Replace,
    Collect,
}

declare interface IViewRegisterInfo {
    id?: number;
    /** 类型 */
    clazz?: import("cc").Constructor<import("../BaseWin").BaseWin>;
    /** 层级 */
    layer?: import("../LayerMgr").UILayer;
    /** 包名 */
    packName?: string;
    /** 界面名 */
    viewName?: string;
    /** 界面类名 */
    className?: string;
    /** 是否边框界面 */
    border?: boolean;
    /** 界面大小 */
    sizeMode?: kUiSize;
    /** 界面对齐 */
    alignMode?: kUiAlign;
    /** 界面参数 */
    paramMode?: kUiParam;
    /** 遮罩 */
    mask?: any;
    /** 点击区域外关闭 */
    clickout?: boolean;
    /** 缓动动画 */
    tweenEffect?: boolean;
    /** 背景模糊 */
    afterEffect?: boolean;
    /** 节点顺序 */
    siblingIndex?: number;
    /** 有效期，界面close后，在有效期内不会被关闭，只是被隐藏 */
    expireSec?: number;
    /** 忽略mask 判断 */
    maskIgnore?: boolean;
    /** 透明界面（忽略隐藏逻辑） */
    lucency?: boolean;
    /** 是否特殊界面，如loading,waitUI,... */
    special?: boolean;
}

declare interface IFProp {
    /** FGUI元件名字*/
    name?: string;
    names?: string[];
    /** FGUI元件路径*/
    path?: string;
    /** 子组件*/
    type?: import("cc").Constructor<import("cc").Component>;
    /** 子组件*/
    comp?: { comp: import("cc").Constructor<import("cc").Component>, params?: { [x: string]: any }, loader?: boolean }[];
    /** 虚列表*/
    virtual?: boolean;
    /** 列表项组件*/
    itemRenderer?: import("cc").Constructor<import("cc").Component>;
    /** 装载器*/
    loader?: { type: import("cc").Constructor<import("cc").Component>, packageName?: string, viewName?: string };
    /** 控制器*/
    ctrl?: boolean;
    /** 动画 */
    anim?: boolean;
    /** 是否必须*/
    required?: boolean;
    /** 红点key */
    redK?: string;
    /** 开启层次化渲染 */
    batch?: boolean;
    /** 节点不进行层次化渲染 */
    preventBatch?: boolean;

    [x: string]: any;

    initHandle?: (this: import("../BaseComponent").BaseComponent, component: any, prop: IFProp) => void;
}