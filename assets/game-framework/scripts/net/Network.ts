import { js, EventTarget, Scheduler, ISchedulable, director } from "cc";
import { debugUtil } from "../base/debugUtil";
import { getUuid } from "../base/uuid";
import { ByteArray } from "./ByteArray";
import { WebSocket } from "./WebSocket";

export const bufferPool: any = new js.Pool(function (buf: ByteArray) {
    buf.position = 0;
    buf.length = 0;
}, 8);
bufferPool.get = function () {
    return bufferPool._get() || new ByteArray();
}

export class Network extends EventTarget implements ISchedulable {
    public static HEAD_SIZE: number = 8;

    public iswss: boolean = false;
    public id?: string;
    public uuid?: string;

    private _serverAddr: string;
    private _serverPort: number;
    private _gatewayFlag: string;
    private _sendBuf: ByteArray;
    private _receiveBuf: ByteArray;
    private _webSocket: WebSocket;

    private _paused: boolean = false;

    constructor() {
        super();
        this.id = 'Network';
        this.uuid = getUuid();
        Scheduler.enableForTarget(this);
        this._sendBuf = new ByteArray();
        this._receiveBuf = new ByteArray();
    }

    public pause() { this._paused = true; }
    public resume() { this._paused = false; }

    public init(ip: string, port: number, gatewayFlag?: string): boolean {
        debugUtil.log(`net init ${ip}:${port}`);
        this._serverAddr = ip;
        this._serverPort = port;
        this._gatewayFlag = gatewayFlag??'';

        this._webSocket = new WebSocket();
        this._webSocket.type = WebSocket.TYPE_BINARY;
        this._webSocket.on("socketData", this._onData, this);
        this._webSocket.on("connect", this._onConnected, this);
        this._webSocket.on("close", this._onClosed, this);
        this._webSocket.on("ioError", this._onError, this);
        return this.connect();
    }

    public connect(): boolean {
        debugUtil.log(`try to connect to ${this._serverAddr}:${this._serverPort}${this._gatewayFlag?`/${this._gatewayFlag}`:''}`);
        if (this.iswss) {
            // this._webSocket.connectByUrl("wss://" + this._serverAddr + ":" + this._serverPort);
            this._webSocket.connectByUrl(`wss://${this._serverAddr}:${this._serverPort}${this._gatewayFlag?`/${this._gatewayFlag}`:''}`);
        } else {
            // this._webSocket.connect(this._serverAddr, this._serverPort);
            this._webSocket.connectByUrl(`ws://${this._serverAddr}:${this._serverPort}`);
        }
        return true;
    }

    public connected() {
        return this._webSocket.connected;
    }

    public reset() {
        if (this._webSocket) {
            this._webSocket.off("socketData", this._onData, this);
            this._webSocket.off("connect", this._onConnected, this);
            this._webSocket.off("close", this._onClosed, this);
            this._webSocket.off("ioError", this._onError, this);
            this._webSocket.close();
            director.getScheduler().unscheduleUpdate(this);
        }
    }

    public reConnect() {
        debugUtil.log("do reConnect");
        this.reset();
        this.init(this._serverAddr, this._serverPort);
    }

    public resetAddr(ip: string, port: number) {
        this.reset();
        this.init(ip, port);
    }

    public send(seq: number, cmd: number, buffer: Uint8Array, len: number) {
        this._sendBuf.writeShort(buffer.length);
        this._sendBuf.writeShort(seq);
        this._sendBuf.writeInt(cmd);
        this._sendBuf._writeUint8Array(buffer);
    }

    private _onConnected() {
        this._sendBuf.clear();
        debugUtil.log(`connected to ${this._serverAddr}:${this._serverPort}`);
        director.getScheduler().unscheduleUpdate(this);
        director.getScheduler().scheduleUpdate(this, 0, false);
        this.emit("connect");
    }

    private _onData() {
        this._webSocket.readBytes(this._receiveBuf, this._receiveBuf.length);
    }

    private _onClosed(closeEvt) {
        debugUtil.log("WebSocket closed");
        this.emit("close", closeEvt);
    }

    private _onError(errorEvt) {
        debugUtil.log("WebSocket error");
        this.emit("ioError", errorEvt)
    }

    private _consumeBytes(buf: ByteArray) {
        let pos = buf.position;
        buf.readBytes(buf);
        buf.length -= pos;
        buf.position = 0;
    }

    private _getSendBufferSize() {
        return this._sendBuf.length;
    }

    update() {
        if (!this._paused) {
            let size = this._getSendBufferSize();
            if (size >= Network.HEAD_SIZE) {
                this._webSocket.writeBytes(this._sendBuf);
                this._sendBuf.clear();
            }
            let bConsumed: boolean = false;
            while (this._receiveBuf.readAvailable >= Network.HEAD_SIZE) {
                let len = this._receiveBuf.readUnsignedShort();
                let seq = this._receiveBuf.readUnsignedShort();
                let cmd = this._receiveBuf.readUnsignedInt();
                if (this._receiveBuf.readAvailable < len) {
                    this._receiveBuf.position -= Network.HEAD_SIZE;
                    break;
                }
                let buffer = bufferPool.get();
                if (len != 0)
                    this._receiveBuf.readBytes(buffer, 0, len);

                bConsumed = true;
                this.emit("onSocketData", {
                    cmd: cmd,
                    seq: seq,
                    buf: buffer
                });
                if (this._paused)
                    break;
            }
            if (bConsumed)
                this._consumeBytes(this._receiveBuf);
        }
    }
}
