declare type Constructor<T = any> = { new(...args): T }

declare type AbstractConstructor<T = any> = { prototype: T }

declare type XConstructorParameters<T> = T extends new(...args: infer R) => any ? R : never;

type RecursiveReadonly<T> = {
    readonly [K in keyof T]: T[K] extends number | string | boolean | Function ? T[K] : RecursiveReadonly<T[K]>
};

type KeyValuePair<TK, TV> = {
    key: TK,
    value: TV
}


type ReadonlyKeyValuePair<TK, TV> = { readonly [K in keyof KeyValuePair<TK, TV>]?: KeyValuePair<TK, TV>[K] }

type Keys<T> = keyof T;
type KeysWithoutType<T, ExcludeType, TK = keyof T> = TK extends keyof T ? T[TK] extends ExcludeType ? never : TK : never;
type KeysWithType<T, ExtractType, TK = keyof T> = TK extends keyof T ? T[TK] extends ExtractType ? TK : never : never;
type KeysWithPrefix<T, Prefix extends string, TK = keyof T> = TK extends keyof T ? TK extends `${Prefix}${infer Rest}` ? `${Prefix}${Rest}` : never : never;
type KeysWithSuffix<T, Suffix extends string, TK = keyof T> = TK extends keyof T ? TK extends `${infer First}${Suffix}` ? `${First}${Suffix}` : never : never;
type KeysAppendPrefix<T, Prefix extends string> = keyof AppendPrefix<T, Prefix>;
type FirstUppercase<Name> = Name extends `${infer First}${infer Rest}` ? `${Uppercase<First>}${Rest}` : Name;
/** 仅首字母大写 */
type JustFirstUppercase<Name> = Name extends `${infer First}${infer Rest}` ? `${Uppercase<First>}${Lowercase<Rest>}` : Name;

/**
 * 创建一个排除了ExcludeType类型属性的类型
 */
type WithoutType<T, ExcludeType> = { [K in KeysWithoutType<T, ExcludeType>]: T[K] };
/**
 * 创建一个仅包含ExtractType类型属性的类型
 */
type WithType<T, ExtractType> = { [K in KeysWithType<T, ExtractType>]: T[K] };
/**
 * 创建一个仅包含某个前缀的类型
 */
type WithPrefix<T, Prefix extends string> = { [K in KeysWithPrefix<T, Prefix>]: T[K] };
/**
 * 创建一个仅包含某个后缀的类型
 */
type WithSuffix<T, Suffix extends string> = { [K in KeysWithSuffix<T, Suffix>]: T[K] };
/**
 * 对类型的所有属性添加前缀
 */
type AppendPrefix<T, Prefix extends string> = { [K in Keys<T> as K extends string ? `${Prefix}${FirstUppercase<K>}` : K]: T[K] }

type MakeNewProp<T, Name extends string, U> = T & Name extends keyof T ? {} : { [K in Name]: U };


/**
 * 定义具有特定前缀或者后缀属性名称的类型，
 * Name是需要拓展的属性名称，可以是一个string或者string联合类型，
 * T是该属性的类型，
 * Prefix是拓展后属性名的前缀，
 * Suffix是拓展后属性名的后缀
 */
type DefPropsWithName<Name extends string, T, Prefix extends string = '', Suffix extends string = ''> = {
    [K in `${Prefix}${Name}${Suffix}`]?: T
};

type PipeFunction<T extends Function> = T extends (...args: any) => infer R ? (arg?: R) => any : Function;

type ProtoData = { cmd: string, bytes: Uint8Array };

type SingleParameter<T extends Function> = T extends (arg: infer R) => any ? R : any;

type ArrayType<T extends Array<any>> = T extends Array<infer R> ? R : any;

type FCallable<T extends Function> = T & {
    call<U>(thiz: U, ...args: T extends (..._: infer R) => any ? R : any): T extends (..._: any) => infer R ? R : any;
}

interface ITickable {
    tick(dt: number): any;
}

type Predicator<T> = (data: T) => boolean;

type DefMixin<Origin, Other> = { [K in keyof Origin as K extends keyof Other ? never : K]: Origin[K] } & Other;

interface Window {
    pako: {
        /**
         * compress
         */
        deflate: (data: string | Uint8Array | ArrayBuffer) => Uint8Array;
        /**
         * decompress
         */
        inflate: (data: string | Uint8Array | ArrayBuffer) => Uint8Array
    }
}

declare namespace gFramework {
    //type defines

    //usable fields
    export const gameIns: import('./scripts/base/BaseGameInstance').IGameInstance;
    export const resMgr: import("../game-framework/scripts/res/ResMgr").ResMgr;
    export const layerMgr: import("../game-framework/scripts/view/LayerMgr").LayerMgr;
    export const viewMgr: import("../game-framework/scripts/view/ViewMgr").ViewMgr;
    export const systemMgr: typeof import("../game-framework/scripts/base/SystemMgr").systemMgr;
    export const net: typeof import('../game-framework/scripts/net/GameNet').netIns;
    export const timerCenter: import("../game-framework/scripts/timer/PriorityTimer").PriorityTimer;
    export const localStorage: IStorage;
    export const globalEvent: import("cc").EventTarget;
    export const waiter: import("../game-framework/scripts/utils/AsyncWaiter").AsyncWaiter;
    export const soundPlayer: IGameSoundPlayer;
    export const useGM: boolean;
    export const cryptoJs: any;
    export const uiCamera: import('cc').Camera;

    export function log(message: any, ...args: any[]): void;
    export function forceLog(message: any, ...args: any[]): void;
    export function warn(message: any, ...args: any[]): void;
    export function error(message: any, ...args: any[]): void;
    export function assert(condition: any, message?: string): void;
}

declare namespace gFramework {
    //types
    export interface IBigNumberLike {
        radix: number;
        exp: number;
    }

    export interface IPoolItem {
        onPoolCreate(...args: any[]): void;
        onPoolReuse(...args: any[]): void;
        onPoolRestore(): void;
        onPoolDispose(): void;
    }

    export type ObjectPoolOption<T extends IPoolItem> = {
        /** 对象池有效时间，毫秒，5000的倍数，对象池多长时间后没有被使用则进行清除，默认为0，<=0为永远不清除 */
        expireMs?: number;
        /** 是否不受管理器控制，这意味着ObjectPool中的一些全局控制的方法对其无效 */
        noManage?: boolean;
        /** 创建函数 */
        ctor: () => T;
        /** 创建时参数获取 */
        ctorArgs?: () => any[];
        /** 重用时参数获取 */
        reuseArgs?: () => any[];
    }

    export interface IStorage {
        setItem(key: string, value: string);
        getItem(key: string): string;
        removeItem(key: string);
        clear();
    }

    export type PromiseDefer<T> = {
        promise: Promise<T>,
        resolve: (arg: T) => void,
        reject: (err?: any) => void,
    }

    export interface IResHolder {
        onResUnuse(): void;
    }

    interface IGameSoundPlayer {
        /** 播放音效 */
        playSound(soundName: string, option?: any): void;
        /** 播放音乐 */
        playMusic(musicName: string, option?: any): void;
        /** 播放ui音效 */
        playUISound(soundName: string, option?: any): void;
        /** 设置音乐开关 */
        setMusic(isOn: boolean): void;
        /** 设置音效开关 */
        setEffect(isOn: boolean): void;
    }

    interface ISignalManager<Signal extends string|number|symbol = string|number> {
        /** 自定义数据 */
        readonly signalDatas: Readonly<Record<Signal, any>>;

        /**
         * 设置信号
         */
        setSignal(key: Signal): void;
        /**
         * 设置信号
         * @param 自定义的信号数据
         */
        setCustomSignal(key: Signal, data: any): void;
        /** 获取信号 */
        getSignal(key: Signal, defaultValue?: any): any;
        /** 消耗一次信号 */
        consumeSignal(key: Signal): any;
        /** 清除一个特定信号 */
        clearOneSignal(key: Signal): void;
        /** 清除所有信号 */
        clearSignal(): void;
    }

    type SortFunc<T> = (a: T, b: T) => number;

    interface ISorter<T> {
        sort: SortFunc<T>;
    }

    interface IDumpable {
        dump(): string|void;
    }

    interface ISerializable<T> {
        seriazlize(): Uint8Array;
        deserialize(byteArray: Uint8Array): T;
    }

    interface IPlayableListener<T> {
        onTargetPlay(target: T): void;
        onTargetPause(target: T): void;
        onTargetWillStop(target: T): void;
        onTargetStop(target: T): void;
    }

    interface INetworkHook {
        onRelogin?(success: Function, failure: Function);
        onReconnect?(success: Function, failure: Function);
    }
}

/** 小游戏的api定义 */
declare namespace wx {
    type APICallback<TSuccess = any, TFailure = any> = {
        /** 接口调用成功的回调函数 */
        success?: (res: TSuccess) => void;
        /** 接口调用失败的回调函数 */
        fail?: (err?: TFailure) => void;
        /** 接口调用结束的回调函数（调用成功、失败都会执行） */
        complete?: () => void;
    }

    /** en英文，zh_CN简体中文，zh_TW繁体中文 */
    type WXUserInfoLang = 'en' | 'zh_CN' | 'zh_TW'

    type WXStorageData = APICallback & {
        /** 本地缓存中指定的key */
        key: string;
        /** 需要存储的对象，只支持原生类型、Date、及能通过JSON.stringify序列化的对象 */
        data: any;
        /**
         * 是否开启加密存储。只有异步的 setStorage 接口支持开启加密存储。
         * 开启后，将会对 data 使用 AES128 加密，接口回调耗时将会增加
         * 若开启加密存储，setStorage 和 getStorage 需要同时声明 encrypt 的值为 true。
         * 此外，由于加密后的数据会比原始数据膨胀1.4倍，因此开启 encrypt 的情况下，单个 key 允许存储的最大数据长度为 0.7MB，所有数据存储上限为 7.1MB
         */
        encrypt?: boolean;
    }

    type WXKVData = {
        key: string,
        value: string
    }

    type WXClearStorageOption = APICallback & {}
    type WXRemoveStorageOption = APICallback & {
        /** 本地缓存中指定的key */
        key: string;
    }
    type WXBounding = {
        /** 宽度px */
        width: number;
        /** 高度px */
        height: number;
        /** 上边界坐标px */
        top: number;
        /** 右边界坐标px */
        right: number;
        /** 下边界坐标px */
        bottom: number;
        /** 坐边界坐标px */
        left: number;
    }

    type WXSystemInfo = {
        /** 设备像素比 */
        pixelRatio: number;
        /** 屏幕宽度 */
        screenWidth: number;
        /** 屏幕高度 */
        screenHeight: number;
        /** 设备名称 */
        brand: string;
        /**
         * 客户端平台：
         * ios ios微信（包含IPhone、iPad）
         * android Android微信
         * windows Windows微信
         * mac macOS微信
         * devtools 微信开发者工具
         */
        platform: 'ios' | 'android' | 'windows' | 'mac' | 'devtools';
    }

    type WXUserInfo = {
        nickName: string;
        avatarUrl: string;
    }

    type WXGetUserInfoRes = {
        /** 用户信息对象，不包含openid等敏感信息 */
        userInfo: WXUserInfo;
    }

    type WXGetUserInfoParams = {
        /**
         * 是否带上登录态信息。当withCredentials为true时，要求此前又调用过wx.login且
         * 登录态尚未过期，此时返回的数据会包含encryptedData，iv等敏感信息；当withCredentials为
         * false时，不要求有登录态，返回的数据不包含encryptedData，iv等敏感信息
         */
        withCredentials?: boolean;
        /**
         * 显示用户信息的语言
         * en 英文；zh_CN 简体中文，zh_TW 繁体中文
         */
        lang: WXUserInfoLang
    } & APICallback<WXGetUserInfoRes, { errMsg: string }>

    type WXLoginOption = {
        /** 超时时间，单位ms */
        timeout?: number;
    } & APICallback<{ code?: string }, { errMsg: string, errno: number }>

    type WXMidasPaymentOption = {
        /** 支付的类型，game：游戏支付 */
        mode: "game",
        /** 环境配置，0米大师正式环境，1米大师沙箱环境 */
        env: 0 | 1,
        /** 在米大师测申请的应用id */
        offerId: string,
        /** 币种，CNY：人民币 */
        currencyType: "CNY",
        /** 申请接入时的平台，platform与应用id有关 */
        platform?: 'android' | 'windows',
        /** 支付数量（游戏币数量），只支持特定数量，具体可见https://developers.weixin.qq.com/minigame/dev/api/midas-payment/wx.requestMidasPayment.html#buyQuantity-%E9%99%90%E5%88%B6%E8%AF%B4%E6%98%8E*/
        buyQuantity: number,
        /** 分区id */
        zoneId?: number,
        /**
         * 业务订单号，每个订单号只能使用一次，重复使用会失败。
         * 开发者需要确保该订单号在对应游戏下的唯一性，平台会尽可能校验该唯一性约束，
         * 但极端情况下可能会跳过对该约束的校验。
         * 要求32个字符内，只能是数字、大小写字母、符号_-|*组成，不能以下划线（)开头。
         * 建议每次调用wx.requestMidasPayment都换新的outTradeNo。
         * 若没有传入，则平台会自动填充一个，并以下划线开头
         */
        outTradeNo?: string,
    } & APICallback<{ errMsg: string }, { errMsg: string, errCode: number }>

    type WXShowModalOption = {
        /** 提示的标题 */
        title: string,
        /** 提示的内容 */
        content: string,
        /** 是否显示取消按钮，默认true */
        showCancel?: boolean,
        /** 取消按钮的文字，最多4个字符，默认取消 */
        cancelText?: string,
        /** 取消按钮的文字颜色，必须是16进制格式的颜色字符串，默认#000000 */
        cancelColor?: string,
        /** 确认按钮的文字，最多4个字符，默认确定 */
        confirmTxt?: string,
        /** 确认按钮的文字颜色，必须是16进制格式的颜色字符串，默认#000000 */
        confirmColor?: string,
        /**
         * @version 2.17.1
         * 是否显示输入框，默认false
         */
        editable?: boolean,
        /**
         * @version 2.17.1
         * 显示输入框时的提示文本
         */
        placeholderText?: string,
    } & APICallback<WXShowModalSuccessRes, any>

    type WXShowModalSuccessRes = {
        /** editable为true时，用户输入的文本 */
        content?: string,
        /** 为true时，表示用户点击了确定按钮 */
        confirm?: boolean,
        /** 为true时，表示用户点击了取消（用于Android系统区分点击蒙层关闭还是点击取消按钮关闭） */
        cancel?: boolean,
    }

    type WXSetKeepScreenOnOption = {
        /** 是否保持常亮 */
        keepScreenOn: boolean,
        /** 接口调用成功的回调函数 */
        success?: Function,
        /** 接口调用失败的回调函数 */
        fail?: Function,
        /** 接口调用失败的回调函数 */
        complete?: Function
    }

    type WXShareAppMessageOption = {
        /** 转发标题，不传则默认使用当前小游戏的昵称。 */
        title?: string;
        /** 转发显示图片的链接，可以是网络图片路径或本地图片文件路径或相对代码包根目录的图片文件路径。显示图片长宽比是 5:4 */
        imageUrl?: string;
        /** 查询字符串，从这条转发消息进入后，可通过 wx.getLaunchOptionsSync() 或 wx.onShow() 获取启动参数中的 query。必须是 key1=val1&key2=val2 的格式。 */
        query?: string;
        /** 审核通过的图片 ID，>2.4.3，详见https://developers.weixin.qq.com/minigame/dev/guide/open-ability/share/share.html#%E4%BD%BF%E7%94%A8%E5%AE%A1%E6%A0%B8%E9%80%9A%E8%BF%87%E7%9A%84%E8%BD%AC%E5%8F%91%E5%9B%BE%E7%89%87 */
        imageUrlId?: string;
        /** 是否转发到当前群。该参数只对从群工具栏打开的场景下生效，默认转发到当前群，填入false时可转发到其他会话。>2.12.2 */
        toCurrentGroup?: boolean;
        /** 独立分包路径。>2.12.2 */
        path?: string;
    }

    type WXCreateInnerAudioContextOption = {
        /**
         * 是否使用WebAudio作为底层音频驱动，默认关闭。对于段音频、
         * 播放频繁的音频建议开启此选项，开启后将获得更优的性能表现。
         * 由于开启此选项后也会带来一定的内存增长，因此对于长音频建议关闭此选项。
         */
        useWebAudioImplement?: boolean;
    }

    type WXOpenCustomerServiceConversation = {
        /** 会话来源 */
        sessionFrom?: string;
        /** 是否显示会话内消息卡片，设置此参数为 true，用户进入客服会话会在右下角显示"可能要发送的小程序"提示，用户点击后可以快速发送小程序消息 */
        showMessageCard?: boolean;
        /** 会话内消息卡片标题 */
        sendMessageTitle?: string;
        /** 会话内卡片路径 */
        sendMessagePath?: string;
        /** 会话内消息卡片图片路径 */
        sendMessageImg?: string;
        /** 接口调用成功的回调函数 */
        success?: Function;
        /** 接口调用失败的回调函数 */
        fail?: Function;
        /** 接口调用结束的回调函数（调用成功、失败都会执行） */
        complete?: Function;
    }

    type WXAccountInfo = {
        /** 小程序账号信息 */
        miniProgram: {
            /** 小程序 appId */
            appId: string;
            /**
             * 小程序版本
             * develop: 开发版
             * trial: 体验版
             * release: 正式版
             */
            envVersion: 'develop' | 'trial' | 'release';
            /** 线上小程序版本号 */
            version: string;
        },
        /** 插件账号信息（仅在插件中调用时包含这一项） */
        plugin: {
            /** 插件 appId */
            appId: string;
            /** 插件版本号 */
            version: string;
        }
    }

    type WXRequestOption = {
        /** 开发者服务器接口地址 */
        url: string;
        /** 请求的参数 */
        data?: string | Object | ArrayBuffer;
        /** 设置请求的header，header中不能设置Refer */
        header?: Object;
        /** 超时时间，单位为毫秒，默认值为60000 */
        timeout?: number;
        /** HTTP 请求方法 */
        method: 'OPTIONS' | 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'TRACE' | 'CONNECT'
        /**
         * 返回的数据格式，默认json
         * json 返回的数据为JSON，返回后会对返回的数据进行一次JSON.parse。
         * 其他 不对返回的内容进行JSON.parse。
         */
        dataType?: 'json';
        /**
         * 响应的数据类型，默认text
         * text 响应的数据为文本
         * arraybuffer 响应的数据为ArrayBuffer
         */
        responseType?: 'text' | 'arraybuffer';
    } & APICallback<WXRequestSuccessResult, { errMsg: string, errno: number }>

    type WXRequestSuccessResult = {
        /** 开发者服务器返回的数据 */
        data: string | Object | ArrayBuffer;
        /** 开发者服务器返回的HTTP状态码 */
        statusCode: number;
        /** 开发者服务器返回的HTTP Response Header */
        header: Object;
        /** 开发者服务器返回的 cookies，格式为字符串数组 */
        cookies: string[];
    }

    type WXCreateRewardedVideoAdOption = {
        /** 广告单元id */
        adUnitId: string;
        /** 是否启用多例模式，默认为false */
        multiton?: boolean;
    }

    ////////////////////////////////////////////////
    type WXGetSetting = {
        /** 是否同时获取用户订阅消息的订阅状态，默认不获取 */
        withSubscriptions?: boolean;
    } & APICallback<WXGetSettingSuccessResult, { errMsg: string, errno: number }>

    type WXGetSettingSuccessResult = {
        authSetting: WXAuthSetting;
    }

    type WXAuthSetting = {
        "scope.userInfo": boolean;
        "scope.userLocation": boolean;
        "scope.werun": boolean;
        "scope.WxFriendInteraction": boolean;
        "scope.gameClubData": boolean;
    }

    type WXAuthorize = {
        scope: string;
    } & APICallback<never, { errMsg: string }>

    type WXPrivacyAuthorize = {
    } & APICallback<never, { errMsg: string }>

    /////////////////////////////////////////////

    type WXRewardedVideoAd = {
        /** 加载视频激励广告 */
        load: () => Promise<void>;
        /** 显示激励视频广告。激励视频广告将从屏幕下方推入 */
        show: () => Promise<void>;
        /** 摧毁激励视频广告实例 */
        destroy: () => void;
        /** 监听激励视频广告加载事件 */
        onLoad: (listener: (res: any) => void) => void;
        /** 移除激励视频广告加载事件的监听函数 */
        offLoad: (listener: (res: any) => void) => void;
        /** 监听激励视频错误事件 */
        onError: (listener: (err: WXRewardedVideoError) => void) => void;
        /** 移除激励视频错误事件的监听函数 */
        offError: (listener: (err: WXRewardedVideoError) => void) => void;
        /** 监听用户点击 关闭广告 按钮的事件 */
        onClose: (listener: (res: WXRewardedVideoAdResult) => void) => void;
        /** 移除用户点击 关闭广告 按钮的事件的监听函数 */
        offClose: (listener: (res: WXRewardedVideoAdResult) => void) => void;
    }

    type WXRewardedVideoError = {
        /** 错误信息 */
        errMsg: string;
        /**
         * 错误码
         * 1000: 后端接口调用失败
         * 1001: 参数错误
         * 1002: 广告单元无效
         * 1003: 内部错误
         * 1004: 无合适广告
         * 1005: 广告组件审核中
         * 1006: 广告组件被驳回
         * 1007: 广告组件被禁封
         * 1008: 广告单元已关闭
         * 错误码信息及解决方案见：https://developers.weixin.qq.com/minigame/dev/api/ad/RewardedVideoAd.onError.html
         */
        errCode: number;
    }

    type WXRewardedVideoAdResult = {
        /** 是否播放完成 */
        isEnded: boolean;
    }

    type WXShowToastOption = {
        /** 提示的内容 */
        title: string;
        /** 提示的延迟事件，默认1500ms */
        duration?: number;
        /** 是否显示提示透明蒙层，防止触摸穿透，默认false */
        mask?: boolean;
        /**
         * 图标
         * success 显示成功图标，此时 title 文本最多显示 7 个汉字长度；
         * error 显示失败图标，此时 title 文本最多显示 7 个汉字长度；
         * loading 显示加载图标，此时 title 文本最多显示 7 个汉字长度；
         * none 不显示图标，此时 title 文本最多可显示两行，1.9.0及以上版本支持；
         */
        icon?: 'success' | 'error' | 'loading' | 'none';
    } & APICallback;

    type WXShowLoadingOption = {
        /** 提示的内容 */
        title: string;
        /** 是否显示透明蒙层，防止触摸穿透，默认false */
        mask?: boolean;
    } & APICallback;

    type WXHideLoadingOption = {
        /** 目前toast和loading相关接口可以相互混用，此参数可用于取消混用特性 */
        noConflict?: boolean;
    } & APICallback;

    type WXOnShowListener = (res?: {
        /** 场景值 */
        scene: number,
        /**
         * 从微信群聊/单聊打开小程序时，chatType表示具体微信群聊/单聊类型
         * 1 微信联系人单聊；
         * 2 企业微信联系人单聊；
         * 3 普通微信群聊；
         * 4 企业微信互通群聊；
         */
        chatType: number,
        /**
         * 查询参数
         */
        query: Object
    }) => void;

    type WXRealtimeLogManager = {
        log(...args: any[]): void;
        warn(...args: any[]): void;
        error(...args: any[]): void;
        /** 设置过滤关键字 */
        setFilterMsg(msg: string): void;
        /** 添加过滤关键字 */
        addFilterMsg(msg: string): void;
    }

    type WXSetClipboardDataOption = {
        data: string,
        success?: (res) => void;
        fail?: (errMsg) => void;
    }

    type WXEnterOptions = {
        /** 启动小游戏的场景值 */
        scene: number,
        /** 启动小游戏的query参数 */
        query: Object
    }

    type WXConnectSocketOption = {
        /** 开发者服务器wss地址 */
        url: string,
    } & APICallback

    /**
     * text 可以设置背景色和文本的按钮；
     * image 只能设置背景贴图的按钮，背景贴图会直接拉伸到按钮的宽高
     */
    type WXButtonType = 'text' | 'image'

    type WXButtonStyle = {
        /** 左上角横坐标 */
        left: number,
        /** 左上角纵坐标 */
        top: number,
        /** 宽度 */
        width: number,
        /** 高度 */
        height: number,
        /** 背景颜色 */
        backgroundColor: string,
        /** 边框颜色 */
        borderColor: string,
        /** 边框宽度 */
        borderWidth: number,
        /** 边框圆角 */
        borderRadius: number,
        /** 文本的颜色。格式为6为16进制数 */
        color: string,
        /** 文本的水平居中方式 */
        textAlign: 'left' | 'center' | 'right',
        /** 字号 */
        fontSize: number,
        /** 文本的行高 */
        lineHeight: number,
    }

    type WXCreateGameClubButtonOption = {
        /**
         * 按钮的类型：
         */
        type: WXButtonType,
        /** 按钮上的文本，仅当 type 为 text 时有效 */
        text?: string,
        /** 按钮上的图片，仅当 type 为 image 时有效 */
        image?: string,
        /** 游戏圈按钮图标，仅当type为image时有效 */
        icon?: string;
        /** 按钮的样式 */
        style: WXButtonStyle,
        /**
         * 设置后可以跳到对应的活动页面，具体进入mp设置-游戏设置-开始管理-游戏圈管理-由帖子的"游戏内跳转ID"生成
         */
        openlink?: string,
        /**
         * 当传递了openlink值时，此字段生效，决定创建的按钮是否需要有红点，默认为true
         */
        hasRedDot?: boolean,
    }

    type WXCreateUserInfoButtonOption = {
        /**
         * 按钮的类型：
         */
        type: WXButtonType,
        /** 按钮上的文本，仅当 type 为 text 时有效 */
        text?: string,
        /** 按钮上的图片，仅当 type 为 image 时有效 */
        image?: string,
        /** 按钮的样式 */
        style: WXButtonStyle,
        /** 是否带上登录态信息。 */
        withCredentials?: boolean,
        /** 描述用户信息的语言 */
        lang?: WXUserInfoLang
    }

    type WXUserInfoButtonTapListener = (res: { userInfo: WXUserInfo, errMsg: string, errno?: number }) => void

    type WXButtonBase<TapFunc = Function> = {
        /** 按钮的类型 */
        type: WXButtonType,
        /** 按钮上的文本，仅当 type 为 text 时有效 */
        text: string,
        /** 按钮的背景图片，仅当 type 为 image 时有效 */
        image: string,
        /** 按钮的图标，仅当 type 为 image 时有效 */
        icon: string,
        /** 按钮的样式 */
        style: WXButtonStyle,
        /** 显示按钮 */
        show(): void,
        /** 隐藏按钮 */
        hide(): void,
        /** 销毁按钮 */
        destroy(): void,
        /** 监听按钮点击事件 */
        onTap(listener: TapFunc): void,
        /** 移除按钮点击事件的监听函数 */
        offTap(listener: TapFunc): void
    }

    type WXGameClubButton = WXButtonBase & {
        /** 按钮的图标，仅当 type 为 image 时有效 */
        icon: string
    }

    type WXUserInfoButton = WXButtonBase<WXUserInfoButtonTapListener>

    type WXSocketTask = {
        send(arg: { data: string | ArrayBuffer }): void,
        close(): void,
        onOpen(listener: () => void): void,
        onClose(listener: (res: { code: number, reason: string }) => void),
        onError(listener: (errMsg: string) => void),
        onMessage(listener: (res: { data: string | ArrayBuffer }) => void)
    }

    type WXOpenDataContext = {
        /** 开放数据域和主域共享的sharedCanvas */
        canvas: { width: number, height: number },
        /** 向开放数据域发送消息 */
        postMessage(message: { type: 'user', event: string, value?: any } & Record<string, any>);
    }

    type WXCheckSessionOption = {} & APICallback;

    type WXSetUserCloudStorageOption = {
        /** 要修改的kv数据列表 */
        KVDataList: WXKVData[];
    } & APICallback;

    type WXShowShareMenuOption = {
        menus: ('shareAppMessage' | 'shareTimeline')[]
    } & APICallback;

    type WXSetMessageToFriendQueryOption = {
        /** 需要传递的代表场景的数字，需要在0-50之间 */
        shareMessageToFriendScene: number;
        /** 需要传递的字符串数据，长度在128之内 */
        query: string;
    }

    type WXOnShareMessage = {
        /** 转发标题，不传则默认使用当前小游戏的昵称 */
        title?: string;
        /**
         * 转发显示图片的链接，可以是网络图片路径或本地图片文件路径或相对代码包根目录的图片文件路径。显示图片长宽比是 5:4
         */
        imageUrl?: string;
        /**
         * 审核通过的图片ID，详见https://developers.weixin.qq.com/minigame/dev/guide/open-ability/share/share.html#%E4%BD%BF%E7%94%A8%E5%AE%A1%E6%A0%B8%E9%80%9A%E8%BF%87%E7%9A%84%E8%BD%AC%E5%8F%91%E5%9B%BE%E7%89%87
         */
        imageUrlId?: string;
        /**
         * 查询字符串，必须是key1=val1&key2=val2的格式。从这条转发消息进入后，
         * 可通过wx.getLaunchOptionsSync()或wx.onShow()获取启动参数中的query。
         */
        query?: string;
    }

    /**
     * 类型详见https://developers.weixin.qq.com/minigame/dev/api/open-api/game-club/wx.getGameClubData.html
     */
    type WXGameClubDataType = 1 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

    type WXGameClubData = {
        /** 用户信息校验字符串 */
        signature: string,
        /** 加密数据 */
        encryptedData: string,
        /** 加密算法的初始向量 */
        iv: string,
        /** 敏感数据对应的云ID */
        cloudID: string
    }

    type WXGetGameClubDataOption = {
        dataTypeList: { type: WXGameClubDataType, subKey?: string }[]
    } & APICallback<WXGameClubData, any>

    function setStorageSync(key: string, data: string): void;
    function getStorageSync(key: string): string;
    function clearStorageSync(): void;
    function removeStorageSync(key: string): void;
    function setStorage(data: WXStorageData): void;
    function getStorage(data: WXStorageData): void;
    function clearStorage(callback: WXClearStorageOption): void;
    function removeStorage(callback: WXRemoveStorageOption): void;

    function login(option: WXLoginOption): void;
    function request(option: WXRequestOption): void;
    function getAccountInfoSync(): WXAccountInfo;
    function createRewardedVideoAd(option: WXCreateRewardedVideoAdOption): WXRewardedVideoAd;
    function getMenuButtonBoundingClientRect(): WXBounding;
    function getSystemInfoSync(): WXSystemInfo;
    function createGameClubButton(option: WXCreateGameClubButtonOption): WXGameClubButton;

    function getUserInfo(option: WXGetUserInfoParams): void;
    function getSetting(option: WXGetSetting): void;
    function authorize(option: WXAuthorize): void;
    function requirePrivacyAuthorize(option: WXPrivacyAuthorize): void;

    function setClipboardData(option: WXSetClipboardDataOption): void;

    function onMemoryWarning(listener: Function): void;
    function offMemoryWarning(listener: Function): void;
    function requestMidasPayment(option: WXMidasPaymentOption): void;
    /** 显示弹窗 */
    function showModal(option: WXShowModalOption): void;
    function setKeepScreenOn(option: WXSetKeepScreenOnOption): void;
    /** 主动拉起转发，进入选择通讯录界面 */
    function shareAppMessage(option: WXShareAppMessageOption): void;
    /** 创建音效组件 */
    function createInnerAudioContext(option: WXCreateInnerAudioContextOption): void;
    /** 打开客服 */
    function openCustomerServiceConversation(option: WXOpenCustomerServiceConversation): void;
    /** 显示消息提示框 */
    function showToast(option: WXShowToastOption): Promise<void>;
    /** 显示loading提示框。需主动调用wx.hideLoading才能关闭提示框 */
    function showLoading(option: WXShowLoadingOption): Promise<void>;
    /** 隐藏loading提示框 */
    function hideLoading(option?: WXHideLoadingOption): Promise<void>;
    /** 监听小游戏回到前台的事件 */
    function onShow(listener: WXOnShowListener): void;
    /** 监听小游戏隐藏到后台事件。锁屏、按HOME键退到桌面、显示在聊天顶部等操作会触发此事件 */
    function onHide(listener: () => void): void;
    /** 监听小程序错误事件 */
    function onError(listener: (message: string, stack: string) => void);
    /** 移除小游戏回到前台的事件的监听函数，不传参则移除所有监听函数 */
    function offShow(listener?: WXOnShowListener): void;
    /** 移除小游戏隐藏到后台事件的监听函数，不传参则移除所有监听函数 */
    function offHide(listener?: () => void): void;
    /** 移除小游戏错误事件的监听函数 */
    function offError(listener?: (message: string, stack: string) => void);
    /** 获取小游戏的打开参数（包括冷启动和热启动） */
    function getEnterOptionsSync(): WXEnterOptions;
    /** 获取小游戏冷启动的打开参数 */
    function getLaunchOptionsSync(): WXEnterOptions;
    /**
     * 监听音频因为受到系统占用而被中断开始事件。
     * 以下场景会触发此事件：闹钟、电话、FaceTime 通话、微信语音聊天、微信视频聊天、有声广告开始播放、实名认证页面弹出等。
     * 此事件触发后，小程序内所有音频会暂停。
     */
    function onAudioInterruptionBegin(listener: () => void): void;
    /**
     * 监听音频中断结束事件。
     * 在收到 onAudioInterruptionBegin 事件之后，小程序内所有音频会暂停，收到此事件之后才可再次播放成功。
     */
    function onAudioInterruptionEnd(listener: () => void): void;
    /**
     * 移除音频中断结束事件的监听函数，不传参则移除所有监听函数。
     */
    function offAudioInterruptionBegin(listener?: () => void): void;
    /**
     * 移除音频中断开始事件的监听函数，不传参则移除所有监听函数。
     */
    function offAudioInterruptionEnd(listener?: () => void): void;
    /** 实时日志管理器实例 */
    function getRealtimeLogManager(): WXRealtimeLogManager;
    /** 创建socket链接 */
    function connectSocket(option: WXConnectSocketOption): WXSocketTask;
    /** 创建用户信息按钮 */
    function createUserInfoButton(option: WXCreateUserInfoButtonOption): WXUserInfoButton;
    /** 检查登录态是否过期，具体见https://developers.weixin.qq.com/minigame/dev/api/open-api/login/wx.checkSession.html*/
    function checkSession(option: WXCheckSessionOption): void;
    /** 显示当前页面的转发按钮 */
    function showShareMenu(option?: WXShowShareMenuOption): void;
    /** 获取开放数据域 */
    function getOpenDataContext(): WXOpenDataContext;
    /** 对用户托管数据进行写数据操作。允许同时写多组KV数据 */
    function setUserCloudStorage(option: WXSetUserCloudStorageOption): void;
    /** 设置wx.shareMessageToFriend接口query字段的值 */
    function setMessageToFriendQuery(option: WXSetMessageToFriendQueryOption): boolean;
    /** 监听主域接受wx.shareMessageToFriend接口的成功失败通知事件 */
    function onShareMessageToFriend(listener: (res: { success: boolean, errMsg: string }) => void): void;
    /** 监听用户点击右上角菜单的「转发」按钮时触发的事件 */
    function onShareAppMessage(listener: (msg: WXOnShareMessage) => WXOnShareMessage | void): void;
    /** 重启当前小程序 */
    function restartMiniProgram();
    /** 获取游戏圈数据 */
    function getGameClubData(option: WXGetGameClubDataOption);
}

/** 游戏网络层*/
declare let Net: typeof import("../game-framework/scripts/net/GameNet");