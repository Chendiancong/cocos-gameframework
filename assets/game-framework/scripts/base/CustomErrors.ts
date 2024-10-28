function errorFrom<T extends Error>(err: any, ErrorCtor: { new(...args): T }) {
    if (err == void 0)
        return new ErrorCtor("unknown error");
    if (err instanceof Error)
        return new ErrorCtor(err.message);
    else
        return new ErrorCtor(err.errCode??err.errMsg??err);
}

export enum PlatformErrorCode {
    Custom,
    IOSNoPay,
    UserCancelPay,
    SdkPayErr,
    CustomerParamError,
    UnknownPlatform,
    PlayAdErr,
    LackPrivacyAuth,
    DummySession,
    ShareFail,
    GameClubDataError
}

const kErrMsg = {
    [PlatformErrorCode.Custom]: 'platform error',
    [PlatformErrorCode.IOSNoPay]: 'ios充值未开放',
    [PlatformErrorCode.UserCancelPay]: '用户取消充值',
    [PlatformErrorCode.SdkPayErr]: 'sdk支付异常',
    [PlatformErrorCode.CustomerParamError]: '客服参数错误',
    [PlatformErrorCode.UnknownPlatform]: '未知的支付平台',
    [PlatformErrorCode.PlayAdErr]: '播放广告出错',
    [PlatformErrorCode.LackPrivacyAuth]: '缺少隐私授权',
    [PlatformErrorCode.DummySession]: '登录态过期',
    [PlatformErrorCode.ShareFail]: '分享失败',
    [PlatformErrorCode.GameClubDataError]: '获取游戏圈数据错误'
}

/** 平台异常 */
class PlatformError extends Error {
    declare private _code: number;

    get code() { return this._code; }

    constructor(code: PlatformErrorCode, msg?: string) {
        super(`${kErrMsg[code] ?? 'unknown platform error'}${msg ? `:${msg}` : ''}`);
        this._code = code;
    }
}

export interface IPlatformError extends PlatformError {}

export const CustomErrors = {
    PlatformError,
}