import { ISocket } from "./ISocket";
import { HTML5WebSocket } from "./HTML5WebSocket";
import { ByteArray } from "./ByteArray";
import { EventTarget, warn, error } from "cc";
import { WECHAT } from "cc/env";
import { getGlobal } from "../base/base";
import { WechatWebSocket } from "./WechatWebSocket";

export class WebSocket extends EventTarget {
    public static TYPE_STRING: string = "webSocketTypeString";

    public static TYPE_BINARY: string = "webSocketTypeBinary";

    private socket: ISocket;

    private _writeMessage: string = "";

    private _readMessage: string = "";

    private _connected: boolean = false;

    private _connecting: boolean = false;

    private _readByte: ByteArray;

    private _writeByte: ByteArray;

    private _bytesWrite: boolean = false;

    private _isReadySend: boolean = false;

    /**
     * 创建一个 egret.WebSocket 对象
     * 参数为预留参数，现版本暂不处理，连接地址和端口号在 connect 函数中传入
     */
    constructor (hosts: string = "", port: number = 0) {
        super();
        this._connected = false;
        this._writeMessage = "";
        this._readMessage = "";

        // if (WECHAT && getGlobal().wx)
        //     this.socket = new WechatWebSocket();
        // else
        //     this.socket = new HTML5WebSocket();
        this.socket = new HTML5WebSocket();
        this.socket.addCallBacks(this.onConnect, this.onClose, this.onSocketData, this.onError, this);
    }

    /**
     * 将套接字连接到指定的主机和端口
     * @param host 要连接到的主机的名称或 IP 地址
     * @param port 要连接到的端口号
     */ 
    public connect(host: string, port: number) : void {
        if (!this._connecting && !this._connected) {
            this._connecting = true;
            this.socket.connect(host, port);
        }
    }

    /**
     * 根据提供的url连接
     * @param url 全地址。如ws://echo.websocket.org:80
     */
    public connectByUrl(url: string): void {
        if (!this._connecting && !this._connected) {
            this._connecting = true;
            this.socket.connectByUrl(url);
        }
    }
    /**
     * 关闭套接字
     */
    public close(): void {
        if (this._connected) {
            this.socket.close();
        }
    }

    private onConnect(): void {
        this._connected = true;
        this._connecting = false;
        this.emit("connect");
    }

    private onClose(closeEvt): void {
        this._connected = false;
        this.emit("close", closeEvt);
    }

    private onError(errorEvt): void {
        if (this._connecting) {
            this._connecting = false;
        }
        this.emit("ioError", errorEvt)
    }

    private onSocketData(message: any): void {
        if (typeof message == "string") {
            this._readMessage += message;
        } else {
            this._readByte._writeUint8Array(new Uint8Array(message));
        }
        this.emit("socketData")
    }

    /**
     * 对套接字输出缓冲区中积累的所有数据进行刷新
     */
    public flush(): void {
        if (!this._connected) {
            warn("Warning #" + 3101);
            return;
        }
        if (this._writeMessage) {
            this.socket.send(this._writeMessage);
            this._writeMessage = "";
        }
        if (this._bytesWrite) {
            this.socket.send(this._writeByte.buffer);
            this._bytesWrite = false;
            this._writeByte.clear();
        }
        this._isReadySend = false;
    }

    /**
     * 将字符串数据写入套接字
     * @param message 要写入套接字的字符串
     */
    public writeUTF(message: string): void {
        if (!this._connected) {
            warn("Warning #" + 3101);
            return;
        }
        if (this._type == WebSocket.TYPE_BINARY) {
            this._bytesWrite = true;
            this._writeByte.writeUTF(message);
        } else {
            this._writeMessage += message;
        }

        this.flush();
    }

    /**
     * 从套接字读取一个 UTF-8 字符串
     * @returns {string}
     */
    public readUTF(): string {
        let message: string;
        if (this._type == WebSocket.TYPE_BINARY) {
            this._readByte.position = 0;
            message = this._readByte.readUTF();
            this._readByte.clear();
        } else {
            message = this._readMessage;
            this._readMessage = "";
        }
        return message;
    }

    /**
     * 从指定的字节数组写入一系列字节。写入操作从 offset 指定的位置开始。
     * 如果省略了 length 参数，则默认长度 0 将导致该方法从 offset 开始写入整个缓冲区。
     * 如果还省略了 offset 参数，则写入整个缓冲区。
     */
    public writeBytes(bytes: ByteArray, offset: number = 0, length: number = 0): void {
        if (!this._connected) {
            warn("Warning #" + 3101);
            return;
        }
        if (!this._writeByte) {
            warn("Warning #" + 3102);
            return;
        }
        this._bytesWrite = true;
        this._writeByte.writeBytes(bytes, offset, length);
        this.flush();
    }

    /**
     * 从套接字读取 length 参数指定的数据字节数。从 offset 所表示的位置开始，将这些字节读入指定的字节数组
     * @param bytes 要将数据读入的 ByteArray 对象
     * @param offset 数据读取的偏移量应从该字节数组中开始
     * @param length 要读取的字节数。默认值 0 导致读取所有可用的数据
     */
    public readBytes(bytes: ByteArray, offset: number = 0, length: number = 0): void {
        if (!this._readByte) {
            warn("Warning #" + 3102);
            return;
        }
        this._readByte.position = 0;
        this._readByte.readBytes(bytes, offset, length);
        this._readByte.clear();
    }

    /**
     * 表示此 Socket 对象目前是否已连接
     */
    public get connected(): boolean {
        return this._connected;
    }

    private _type: string = WebSocket.TYPE_STRING;

    /**
     * 发送和接收数据的格式，默认是字符串格式
     */
    public get type(): string {
        return this._type;
    }

    public set type(value: string) {
        this._type = value;
        if (value == WebSocket.TYPE_BINARY && !this._writeByte) {
            this._readByte = new ByteArray();
            this._writeByte = new ByteArray();
        }
    }
}