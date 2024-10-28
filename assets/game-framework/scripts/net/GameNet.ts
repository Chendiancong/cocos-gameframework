import { CustomEvent } from "../events/Event";;
import { bufferPool, NetworkHandler } from "./NetWorkHandler";
import { ByteArray } from "./ByteArray";
import { EventTarget, director, game, Scheduler, ISchedulable, Game, macro, gfx } from "cc";
import { DEBUG } from "cc/env";
import { debugUtil } from "../base/debugUtil";
import { getUuid } from "../base/uuid";
import { trycatch } from "../base/jsUtil";
import { EnumGameAppState } from "../datas/GameAppState";
import { ExecuteGMResult, SocketCallResult } from "../base/GameInstance";

type ProtoData<T> = Partial<Omit<WithoutType<T, Function>, 'cmd'>>;

export type ReturnOfNetCall = ReturnType<GameNet['call']>&ReturnType<GameNet['send']>;

type InnerSocketData = { cmd: number, seq: number, buf: ByteArray };

export type SocketData = Omit<InnerSocketData, 'buf'> & { protocol: string };

export type SocketDataHook = (gameNet: GameNet, data: SocketData, decodedData: any, pending?: INetPendingCallback) => boolean;

export class NetEvent extends CustomEvent {
    public cmd: number;
    public seq: number;
    public msg: any;
}

export interface INetSuccessCallback {
    (event: NetEvent): void
}

export interface INetFailureCallback {
    (code: number): void
}

export interface INetPendingCallback {
    timeout: number,
    startTime: number,
    success: Function,
    failure: Function,
}

export let NET_DEBUG = DEBUG;
//Protocol
let innerP: any;

export class GameNet extends EventTarget implements ISchedulable {
    private _cmd2Protocol: { [cmd: number]: string } = {};
    private _pendingCallbacks: { [seq: number]: INetPendingCallback } = {};
    private _timeoutCallBacks: { [seq: number]: INetPendingCallback } = {};

    private _keepAliveRecord: { seq: number, time: number }[] = [];

    private _protobufReader: any = (<any>window).protobuf.Reader.create(new Uint8Array(0));
    private _protobufWriter: any = (<any>window).protobuf.Writer.create();

    public c2sLogFilters: { [cmd: number]: true } = {};
    public s2cLogFilters: { [cmd: number]: true } = {};
    public network: NetworkHandler;
    public id?: string;
    public uuid?: string;

    private _nextSeq = function () {
        let seq = 0;
        return function () {
            if (seq > 0xFFFE)
                seq = 0;
            return ++seq;
        }
    }();
    private _timeoutTimer: number;
    private _gameShowTimer: number;

    private _tryConnectCnt: number = 0;

    public constructor() {
        super();
        this.id = 'GameNet';
        this.uuid = getUuid();
        Scheduler.enableForTarget(this);
        this._initCmd2Protocol();
        let ins = this.network = new NetworkHandler();
        ins.on("onSocketData", this._onSocketData, this);
        ins.on("connect", this._connetedFun, this);
        ins.on("ioError", function (errorEvt) {
            this.emit("ioError", errorEvt);
            this._showWaitLayer("ioError");
        }, this);

        ins.on("close", function (closeEvt) {
            this.emit("close", closeEvt);
            this._showWaitLayer("close");
            if (gFramework.gameIns.appState.curState === EnumGameAppState.Loading)
                gFramework.gameIns.onNetLost();
        }, this);

        ins.on("connectionLost", function () {
            this.emit("connectionLost");
            this._showWaitLayer("connectionLost");
        }, this);

        let func = () => {
            this._checkTimeOut();
            this._timeoutTimer = <any>setTimeout(func, 500);
        }
        this._timeoutTimer = <any>setTimeout(func, 500);

        Object.assign(this.c2sLogFilters, _c2sFilters);
        Object.assign(this.s2cLogFilters, _s2cFilters);

        game.on(Game.EVENT_HIDE, this._onGameHide, this);
        game.on(Game.EVENT_SHOW, this._onGameShow, this);
    }

    private _initCmd2Protocol(): void {
        let _P = innerP;
        for (let key in _P) {
            if (_P[key].cmd)
                this._cmd2Protocol[_P[key].cmd] = key;
        }
    }

    private _onGameHide() {
        debugUtil.log("on hide!!!");
        this._pauseTryToSilentConnect = true;
    }

    private _onGameShow() {
        debugUtil.log("on show!!!");
        this._pauseTryToSilentConnect = false;
        this._gameShowTimer = <any>setTimeout(() => {
            this._gameShowTimer = null;
            if (!this.network.connected()) {
                this.tryToSilentConnect();
            }
        }, 500);
    }

    private _duplicate(source: any) {
        if (source == void 0)
            return source;
        if (typeof source === "object") {
            if (Array.isArray(source)) {
                return (source as Array<any>).map(v => this._duplicate(v));
            } else {
                const propNames = Object.getOwnPropertyNames(source);
                const target = {};
                for (const pname of propNames)
                    target[pname] = this._duplicate(source[pname]);
                return target;
            }
        } else {
            return source;
        }
    }

    private _onSocketData(_data: InnerSocketData) {
        let _P = innerP;

        const {
            cmd, seq, buf
        } = _data;

        const protocolStr = this._cmd2Protocol[cmd];
        if (!protocolStr) {
            debugUtil.log(`unknown cmd: ${cmd} seq: ${seq}`);
            return;
        }
        const data = _data as any as SocketData;
        data.protocol = protocolStr;

        let msg: any;
        if (NET_DEBUG) {
            trycatch(() => {
                msg = _P[protocolStr].decode(this._createReader(buf.buffer));
            }, this);
            if (!msg) {
                debugUtil.warn(`协议${_data.cmd} -- ${protocolStr} 解析出错`);
                return;
            }
        } else
            msg = _P[protocolStr].decode(this._createReader(buf.buffer));

        bufferPool.put(buf);

        if (NET_DEBUG && !this.s2cLogFilters[cmd])
            debugUtil.log(`received ${protocolStr} seq: ${seq} data:`, this._duplicate(msg));

        const gameIns = gFramework.gameIns;
        if (gameIns.enableSocketDataHook) {
            do {
                const pending = this._pendingCallbacks[seq];
                if (pending)
                    delete this._pendingCallbacks[seq];
                if (gameIns.processSocketData(this, data, msg, pending)) {
                    do {
                        for (const _ in this._pendingCallbacks)
                            break;
                        this._hideWaitLayer();
                    } while (false);

                    break;
                }
                this._lagacy_onSocketData(data, msg);
            } while (false);
        } else
            this._lagacy_onSocketData(data, msg);
    }

    /**
     * @deprecated internal
     */
    private _lagacy_onSocketData(data: SocketData, msg: any) {
        const {
            seq
        } = data;

        const pending = this._pendingCallbacks[seq] ?? void 0;
        const result = gFramework.gameIns.convertToSocketCallResult(
            this, data, msg
        );
        if (result === SocketCallResult.Success) {
            this.socketDataSuccess(data, msg, pending);
        } else {
            this.socketDataFail(data, msg, pending);
        }
    }

    /** 模拟推送协议 */
    simulatePush(cmd: string, bytes: Uint8Array) {
        const msg = this.decodeProto(cmd, bytes);
        const protocolStr = this._cmd2Protocol[cmd];
        if (NET_DEBUG && !this.s2cLogFilters[cmd]) {
            debugUtil.log(`simulate ${protocolStr} data:`, this._duplicate(msg));
        }
        const netEvent = CustomEvent.create(NetEvent, protocolStr);
        netEvent.cmd = +cmd;
        netEvent.seq = -200;
        netEvent.msg = msg;
        this.emit(protocolStr, netEvent);
        netEvent.msg = undefined;
        CustomEvent.release(netEvent);
    }

    /** 协议解码 */
    decodeProto<T = any>(cmd: string, bytes: Uint8Array) {
        const protocolStr = this._cmd2Protocol[cmd];
        const protocol = innerP[protocolStr];
        gFramework.assert(!!protocol);
        const msg = protocol.decode(this._createReader(bytes.buffer));
        return msg as T;
    }

    /** 协议编码 */
    encodeProto<T = any>(cmd: string, data: T) {
        const protocolStr = this._cmd2Protocol[cmd];
        const protocol = innerP[protocolStr];
        gFramework.assert(!!protocol);
        this._protobufWriter.reset();
        protocol.encode(data, this._protobufWriter);
        const buffer = this._protobufWriter.finish();
        return buffer as Uint8Array;
    }

    private _checkTimeOut() {
        let now = Date.now();
        for (let seq in this._pendingCallbacks) {
            let pending = this._pendingCallbacks[seq];
            if (pending.timeout <= now) {
                this._timeoutCallBacks[seq] = pending;
            }
        }
        for (let seq in this._timeoutCallBacks) {
            let pending = this._timeoutCallBacks[seq];
            delete this._timeoutCallBacks[seq];
            delete this._pendingCallbacks[seq];
            if (pending.failure) {
                debugUtil.log(`seq: ${seq} TimeOut ` + Net.getServerTimeSec());
            }
        }
        if (this._keepAliveRecord.length) {
            let invalidRecordCount: number = 0;
            let now = Date.now();
            for (let record of this._keepAliveRecord) {
                if (record.time + 5000 <= now) {
                    invalidRecordCount++;
                }
            }
            if (invalidRecordCount >= 2) {
                if (!this._reConnecting) {
                    this.emit("netHeartBlock");
                    gFramework.warn("netHeartBlock");
                    this._reConnecting = true;
                    this._doReLoadConnect();
                }
            }
        }
    }

    public pause() {
        this.network.pause();
    }

    public resume() {
        this.network.resume();
    }

    public send(request: any, data?: any) {
        let seq = this._nextSeq();
        let cmd = request.cmd;
        if (NET_DEBUG && !this.c2sLogFilters[cmd]) {
            debugUtil.log(`send ${this._cmd2Protocol[cmd]} seq: ${seq}`, data ? "data: " : "", data || "");
        }
        if (this.network.connected()) {
            this._protobufWriter.reset();
            let w = request.encode(data, this._protobufWriter);
            let buffer = w.finish();
            this.network.send(seq, cmd, buffer, w.len);
        } else {
            if (NET_DEBUG && this.c2sLogFilters[cmd]) {
                debugUtil.log(`send ${this._cmd2Protocol[cmd]} seq: ${seq}`, data ? "data: " : "", data || "");
            }
            this._gameShowTimer = <any>setTimeout(() => {
                this._gameShowTimer = null;
                if (!this.network.connected()) {
                    this.tryToSilentConnect();
                }
            }, 500);
        }
        return seq;
    }

    public call(request: any, data?: any, success?: INetSuccessCallback, failure?: INetFailureCallback, thiz?: any, timeout: number = 5000) {
        let seq = this.send(request, data);
        if (timeout < 0) {
            timeout = -timeout;
        }
        let now = Date.now();
        let pendingCallback: INetPendingCallback = {
            timeout: now + timeout,
            startTime: now,
            success: function (...args: any[]) {
                if (success)
                    success.apply(thiz, args);
            },
            failure: function (...args: any[]) {
                if (failure)
                    failure.apply(thiz, args);
            }
        };
        this._pendingCallbacks[seq] = pendingCallback;
        return seq;
    }

    public socketDataSuccess(socketData: SocketData, decodedData: any, pending?: INetPendingCallback) {
        const netEvent = CustomEvent.create(NetEvent, socketData.protocol);
        netEvent.cmd = socketData.cmd;
        netEvent.seq = socketData.seq;
        netEvent.msg = decodedData;
        if (pending) {
            if (pending.success)
                pending.success(netEvent);
            else
                this.emit(socketData.protocol, netEvent);
        } else if (this.hasEventListener(socketData.protocol))
            this.emit(socketData.protocol, netEvent);
        else
            gFramework.warn(`protocol:${socketData.cmd}, ${socketData.protocol} has no listener`);
        netEvent.msg = void 0;
        CustomEvent.release(netEvent);
    }

    public socketDataFail(socketData: SocketData, decodedData: any, pending?: INetPendingCallback) {
        if (pending?.failure)
            pending.failure(decodedData.ecode)
        this.emit('errorCode', decodedData);
    }

    private _pauseTryToSilentConnect: boolean = false;
    private _silentConnectTimer: boolean = false;
    /** 尝试静默重连  */
    tryToSilentConnect() {
        if (gFramework.gameIns.appState.curState !== EnumGameAppState.Play)
            return;
        if (this._reConnecting) return;
        if (this._pauseTryToSilentConnect || this._rejectConnected) {
            this._removeSilentConnectTimer();
            return;
        }
        if (!this._noMoreConnected) {
            if (!this._silentConnectTimer) {
                debugUtil.log("*****enter silentConnect..");
                this._silentConnectTimer = true;
                director.getScheduler().schedule(this._silentConnectUpdate, <any>this, 3, macro.REPEAT_FOREVER, 0, false);
            }
        }
    }

    private _silentConnectUpdate() {
        if (!this.network.connected()) {
            if (this._tryConnectCnt <= 4) {
                debugUtil.log("*****silentConnect " + (this._tryConnectCnt + 1) + " times");
                this._keepAlive();
                this.network.connect();
                this._tryConnectCnt++;
            } else {
                this._doReLoadConnect();
            }
        } else {
            this._removeSilentConnectTimer();
        }
    }

    doTheReConnect() {
        this.network.reConnect();
    }

    /** 是否重连中 */
    private _reConnecting: boolean;

    /** 连上 */
    private _connetedFun() {
        if (this._silentConnectTimer) {
            debugUtil.log("*****silentConnect  success..");
            this._removeSilentConnectTimer();
            this._reConnetFun();
        } else {
            this._reConnecting = false;
            this._tryConnectCnt = 0;
        }
        this._keepAlive();
        this.emit("connect");
    }

    /** 重连 */
    private _reConnetFun() {
        if (this._noMoreConnected || this._reConnecting) return;
        if (this.reconnect) {
            this._reConnecting = true;
            this._keepAlive();
            this.reconnect(() => {
                this._hideWaitLayer();
                this._tryConnectCnt = 0;
                this._reConnecting = false;
            }, () => {
                this._showWaitLayer("reConnet fail");
                this._reConnecting = false;
            });
        } else {
            this._hideWaitLayer();
        }
    }

    /** 重登 */
    private _doReLoadConnect() {
        debugUtil.log("*****doRelogin~~！");
        this.emit("connectReestablished", true);
        this._removeSilentConnectTimer();
        if (this.relogin) {
            this._reConnecting = true;
            this._keepAlive();
            this.relogin(() => {
                debugUtil.log("relogin success");
                this._hideWaitLayer();
                this._reConnecting = false;
            }, () => {
                debugUtil.log("relogin fail");
                this._hideWaitLayer();
                this._reConnecting = false;
                this.emit("connectionLost");
            });
        }
    }

    private _removeSilentConnectTimer() {
        if (this._silentConnectTimer) {
            this._silentConnectTimer = false;
            director.getScheduler().unschedule(this._silentConnectUpdate, <any>this);
        }
    }

    private _showWaitLayer(reason: string) {
        gFramework.globalEvent.emit("openNetLostWaitUI", true, reason);
        gameNet.tryToSilentConnect();
    }

    private _hideWaitLayer() {
        gFramework.globalEvent.emit("openNetLostWaitUI", false);
    }

    public initServerTime(callback?: Function, failure?: Function) {
        if (this._serverDTime)
            if (callback) callback();

        const now = Date.now();
        gFramework.gameIns.heartBeat(
            this,
            data => {
                const _now = Date.now();
                this.updateServerTime(data.nowMs, _now - now, _now);
                callback && callback();
            },
            code => {
                debugUtil.log(`request failed (${code})`);
                failure && failure(code);
            }
        )
    }

    public updateServerTime(serverNowMs: number, netDelayMs: number, localMs: number = Date.now()) {
        this._serverDTime = Math.floor(0.5 + serverNowMs + 0.5 * netDelayMs - localMs);
        this._netDelay = netDelayMs;
    }

    private _keepAliveTimer: boolean = false;
    private _keepAlive() {
        this.noMoreConnected = false;
        let scheduler = director.getScheduler();
        if (this._keepAliveTimer) {
            scheduler.unschedule(this._keepAliveUpdate, <any>this);
            this._keepAliveTimer = false;
            this._keepAliveRecord.length = 0;
        }
        this._keepAliveTimer = true;
        scheduler.schedule(this._keepAliveUpdate, <any>this, 10, macro.REPEAT_FOREVER, 0, false);
        this._keepAliveUpdate();
    }

    private _keepAliveUpdate() {
        gFramework.gameIns.heartBeat(this);
    }

    private _createReader(buf: ArrayBuffer) {
        let uint8Arr = new Uint8Array(buf);
        let read = this._protobufReader;
        read.buf = uint8Arr;
        read.pos = 0;
        read.len = uint8Arr.length;
        return read;
    }

    public addListener(notify: any, listener: Function, thiz?: any) {
        let protocolStr = this._cmd2Protocol[notify.cmd];
        this.on(protocolStr, listener as any, thiz);
    }

    public removeListener(notify: any, listener: Function, thiz?: any) {
        let protocolStr = this._cmd2Protocol[notify.cmd];
        this.off(protocolStr, listener as any, thiz);
    }

    private _serverDTime: number;
    public get serverDTime(): number {
        return this._serverDTime;
    }

    private _netDelay: number;
    public get netDelay(): number {
        return this._netDelay;
    }

    private _noMoreConnected: boolean;
    public set noMoreConnected(b: boolean) {
        this._noMoreConnected = b;
        if (b) {
            director.getScheduler().unschedule(this._keepAliveUpdate, <any>this);
        }
    }

    private _rejectConnected: boolean;
    public set rejectConnected(b: boolean) {
        this._rejectConnected = b;
        if (b) {
            this.noMoreConnected = true;
            director.getScheduler().unschedule(this._silentConnectUpdate, <any>this);
            director.getScheduler().unschedule(this._keepAliveUpdate, <any>this);
        }
    }

    public relogin?(success: Function, failure: Function): void;

    public reconnect?(success: Function, failure: Function): void;

    public dispose() {
        if (this._timeoutTimer != null) {
            clearTimeout(this._timeoutTimer);
        }
        if (this._gameShowTimer != null) {
            clearTimeout(this._gameShowTimer);
        }
        director.getScheduler().unscheduleAllForTarget(this);
        game.off(Game.EVENT_SHOW, this._onGameShow, this);
    }
}

export let gameNet: GameNet;
export function enable(iswss: boolean = false) {
    if (!gameNet) {
        gameNet = new GameNet();
        gameNet.network.iswss = iswss;
    }
}

export function init(ip: string, port: number, gateway_flag: string) {
    gameNet.network.reset();
    gameNet.network.init(ip, port, gateway_flag);
}

export function setProtocol(protocol: any) {
    innerP = protocol;
}

let _c2sFilters = {};
export function addC2sLogFilter(cmd: number) {
    if (gameNet)
        gameNet.c2sLogFilters[cmd] = true;
    else
        _c2sFilters[cmd] = true;
}

export function delC2sLogFilter(cmd: number) {
    if (gameNet)
        delete gameNet.c2sLogFilters[cmd];
    else
        delete _c2sFilters[cmd];
}

let _s2cFilters = {};
export function addS2cLogFilter(cmd: number) {
    if (gameNet)
        gameNet.s2cLogFilters[cmd] = true;
    else
        _s2cFilters[cmd] = true;
}

export function delS2cLogFilter(cmd: number) {
    if (gameNet)
        delete gameNet.s2cLogFilters[cmd];
    else
        delete _s2cFilters[cmd];
}

export function disable() {
    if (gameNet) {
        gameNet.network.reset();
        gameNet.dispose();
        gameNet = null;
    }
}

export function addListener(notify: any, listener: Function, thiz?: any) {
    if (!notify) return;
    gameNet.addListener(notify, listener, thiz);
}

export function removeListener(notify: any, listener: Function, thiz?: any) {
    if (!notify) return;
    gameNet.removeListener(notify, listener, thiz);
}

// 增加事件监听（socket连接、socket错误、socket关闭、错误码、心跳包阻塞、断开连接、重新建立连接）
export function addEventListener(
    type: "connect" | "ioError" | "close" | "errorCode" | "netHeartBlock" | "connectionLost" | "connectReestablished",
    listener: Function,
    thisObject?: any,
    once?: boolean) {
    gameNet.on(type, listener as any, thisObject, once);
}

export function removeEventListener(
    type: "connect" | "ioError" | "close" | "errorCode" | "netHeartBlock" | "connectionLost" | "connectReestablished",
    listener: Function,
    thisObject?: any
) {
    gameNet.off(type, listener as any, thisObject);
}

export function targetOff(target: any) {
    // 游戏在没有初始化网络模块的时候重启，会报错
    if (!gameNet)
        return;
    gameNet.targetOff(target);
}

export function send<T>(request: Constructor<T>, data?: ProtoData<T>);
export function send(request: any, data?: any) {
    gameNet.send(request, data);
}

export function call<T>(request: Constructor<T>, data: ProtoData<T>, success?: INetSuccessCallback, failure?: INetFailureCallback, thiz?: any, timeout?: number);
export function call(request: any, data?: any, success?: INetSuccessCallback, failure?: INetFailureCallback, thiz?: any, timeout: number = 6) {
    gameNet.call(request, data, success, failure, thiz, timeout * 1000);
}

export function getServerTime() {
    return gameNet != void 0 ?
        Date.now() + gameNet.serverDTime :
        new Date().getTime();
}

export function getServerTimeSec() {
    return getServerTime() * 1e-3 >> 0;
}

export function getServerTimeFloatSec() {
    return getServerTime() * 1e-3;
}

export function getServerDTime() {
    return gameNet.serverDTime;
}

export function pause() {
    gameNet.pause();
}

export function resume() {
    if (gameNet)
        gameNet.resume();
}

export function initServerTime(callback?: Function, failure?: Function) {
    gameNet.initServerTime(callback, failure);
}

export function noMoreConnect(value: boolean) {
    if (gameNet)
        gameNet.noMoreConnected = value;
}

export function rejectConnect(value: boolean) {
    if (gameNet)
        gameNet.rejectConnected = value;
}


export function setRelogin(relogin: (success: Function, failure: Function) => void) {
    gameNet.relogin = relogin;
}

export function setReconnect(reconnect: (success: Function, failure: Function) => void) {
    gameNet.reconnect = reconnect;
}


export function connected() {
    return gameNet ? gameNet.network.connected() : false;
}

export function initAsync(ip: string, port: number, gateway_flag?: string) {
    return new Promise<void>(function (resolve, reject) {
        init(ip, port, gateway_flag);
        function unregister() {
            removeEventListener("connect", onConnect, null);
            removeEventListener("connectReestablished", onConnect, null);
            removeEventListener("close", onClose, null);
            removeEventListener("ioError", onError, null);
        }
        function onConnect() {
            unregister();
            resolve();
        }
        function onClose(closeEvt) {
            unregister();
            // reject('network closed');
            reject(closeEvt.type ? new Error(closeEvt.type) : new Error('' + closeEvt))
        }
        function onError(errorEvt) {
            unregister();
            // reject('network error');
            reject(errorEvt.type ? new Error(errorEvt.type) : new Error('' + errorEvt));
        }
        addEventListener("connect", onConnect, null);
        addEventListener("connectReestablished", onConnect, null);
        addEventListener("close", onClose, null);
        addEventListener("ioError", onError, null);
    });
}

export function initServerTimeAsync() {
    return new Promise<void>(function (resolve, reject) {
        initServerTime(resolve, reject);
    });
}

export function acall<T, TRep = any>(request: Constructor<T>, data?: ProtoData<T>, time?: number): Promise<TRep>;
export function acall(request: any, data?: any, time?: number): Promise<any> {
    return new Promise(function (resolve, reject) {
        call(request, data, function (evt: NetEvent) {
            resolve(evt.msg);
        }, function (code) {
            reject(code);
        }, undefined, time);
    });
}

export const kSaveACallRetSuccess = 1;
export const kSaveACallRetFailure = 0;
export function save_acall<T = any>(request: any, data?: any, time?: number): Promise<{ result: number, msg: T, code: number }> {
    return acall(request, data, time)
        .then(
            (msg) => {
                return { result: kSaveACallRetSuccess, msg: msg, code: 0 };
            },
            (code) => {
                return { result: kSaveACallRetFailure, msg: null, code: code };
            }
        ) as Promise<{ result: number, msg: T, code: number }>
}

export function create_save_reject(code: number = 0) {
    return Promise.resolve({ result: kSaveACallRetFailure, msg: null, code: code })
}

export function gm(cmd: string) {
    if (gFramework.useGM)
        gFramework.gameIns.gm(cmd)
}

export function gmc(cmd: string) {
    if (gFramework.useGM)
        return new Promise<ExecuteGMResult>(resolve => {
            if (gFramework.gameIns)
                gFramework.gameIns.gm(cmd, resolve);
            else
                resolve(ExecuteGMResult.Fail);
        });
    else
        return Promise.resolve(ExecuteGMResult.Fail);
}

/** 模拟推送协议 */
export function simulatePush(cmd: string, bytes: Uint8Array) {
    gameNet.simulatePush(cmd, bytes);
}

/** 协议解码 */
export function decodeProto<T = any>(cmd: string, bytes: Uint8Array) {
    return gameNet.decodeProto<T>(cmd, bytes);
}

/** 协议编码 */
export function encodeProto<T = any>(cmd: string, data: any) {
    return gameNet.encodeProto<T>(cmd, data);
}