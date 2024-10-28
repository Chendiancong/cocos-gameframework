import { asDelegate, IDelegate } from "../base/Delegate";

export const enum EnumGameAppState {
    /** 未启动 */
    None,
    /** 启动完成 */
    Init,
    /** 初始化中 */
    Launching,
    /** 热更新 */
    HotUpdating,
    /** 热更新完成 */
    PostHotUpdate,
    /** 初始化完成 */
    PostLaunch,
    /** 登录 */
    Login,
    /** 登录完成 */
    PostLogin,
    /** 准备进入游戏 */
    PreEnter,
    /** 游戏加载中 */
    Loading,
    /** 游戏加载完成 */
    PostLoading,
    /** 游戏中 */
    Play,
    /** 暂停中 */
    Pause,
}

export class GameAppState {
    private _curState: EnumGameAppState;
    private _lastState: EnumGameAppState;

    @asDelegate
    onStateChanged: IDelegate<(curState: EnumGameAppState, lastState: EnumGameAppState) => void>;

    get curState() { return this._curState; }
    get lastState() { return this._lastState; }

    constructor() {
        this._curState = this._lastState = EnumGameAppState.None;
    }

    is(state: EnumGameAppState) {
        return this._curState == state;
    }

    changeState(state: EnumGameAppState) {
        if (this._curState == state)
            return;
        this._lastState = this._curState;
        this._curState = state;
        this.onStateChanged.entry(this._curState, this._lastState);
    }
}