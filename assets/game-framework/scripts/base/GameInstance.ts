import { GameAppState } from "../datas/GameAppState";
import { GameNet, INetPendingCallback, ReturnOfNetCall, SocketData } from "../net/GameNet";

/** 心跳数据 */
export type HeartBeatData = {
    /** 当前服务器时间 */
    nowMs: number;
}

export type NetSeq = ReturnOfNetCall;

export const enum ExecuteGMResult {
    Success = 1,
    Fail,
}

export const enum SocketCallResult {
    Success = 1,
    Fail
}

export interface IGameInstance {
    /** 程序状态 */
    readonly appState: GameAppState;
    /** 是否启用自定义的socket处理器，若为true，必须重写processSocketData */
    readonly enableSocketDataHook: boolean;

    /** 心跳 */
    heartBeat(gameNet: GameNet, success?: (data: HeartBeatData) => void, failure?: (code: number) => void): NetSeq;
    /** 执行gm命令 */
    gm(cmd: string, cb?: (ret: ExecuteGMResult) => void): void;
    /**
     * 根据服务端返回的数据分析该次调用的结果
     */
    convertToSocketCallResult(gameNet: GameNet, socketData: SocketData, decodedData: any): SocketCallResult;
    /**
     * socket数据处理器
     * @param gameNet GameNet实例
     * @param socketData socket原始数据
     * @param decodedData socket解包后的数据
     * @param pending 待解决的请求
     * @return 返回true表示自定义的socket数据处理成功，false表示仍需要进行默认处理
     */
    processSocketData?(gameNet: GameNet, socketData: SocketData, decodedData: any, pending: INetPendingCallback): boolean;
    /** 无网络时 */
    onNetLost(): void;
}

export abstract class GameInstance implements IGameInstance {
    appState = new GameAppState();
    abstract get enableSocketDataHook(): boolean;

    abstract gm(cmd: string, cb?: (ret: ExecuteGMResult) => void): void;

    abstract heartBeat(gameNet: GameNet, success?: (data: HeartBeatData) => void, failure?: (code: number) => void): ReturnOfNetCall;

    convertToSocketCallResult(gameNet: GameNet, socketData: SocketData, decodedData): SocketCallResult {
        return !!decodedData.ecode ?
            SocketCallResult.Fail :
            SocketCallResult.Success;
    }

    processSocketData?(gameNet: GameNet, socketData: SocketData, decodedData: any, pending: INetPendingCallback): boolean;

    onNetLost() { }
}