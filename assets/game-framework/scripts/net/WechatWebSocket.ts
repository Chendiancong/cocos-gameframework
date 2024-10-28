import { ISocket } from "./ISocket";

export class WechatWebSocket implements ISocket {
    private socket: wx.WXSocketTask;

    private onConnect: Function;
    private onClose: Function;
    private onSocketData: Function;
    private onError: Function;
    private thisObject: any;

    private host: string = '';
    private port: number = 0;

    constructor() {
        console.log('use wechat web socket');
    }

    connect(host: string, port: number) {
        this.host = host;
        this.port = port;

        let socketServerUrl = "ws://" + this.host + ":" + this.port;
        this.socket = wx.connectSocket({ url: socketServerUrl });
        this._bindEvent();
    }

    connectByUrl(url: string) {
        this.socket = wx.connectSocket({ url });
        this._bindEvent();
    }

    addCallBacks(onConnect: Function, onClose: Function, onSocketData: Function, onError: Function, thisObject: any) {
        this.onConnect = onConnect;
        this.onClose = onClose;
        this.onSocketData = onSocketData;
        this.onError = onError;
        this.thisObject = thisObject;
    }

    send(message: any) {
        const toSend = Object.create(null);
        toSend.data = message
        this.socket.send(toSend);
    }

    close(): void {
        this.socket.close();
    }

    disconnect(): void {
        this.close();
    }

    private _bindEvent() {
        let that = this;
        let socket = this.socket;
        socket.onOpen(function () {
            if (that.onConnect)
                that.onConnect.call(that.thisObject);
        });
        socket.onClose(function (res) {
            if (that.onClose)
                that.onClose.call(that.thisObject, `${res.code}:${res.reason}`);
        });
        socket.onError(function (msg) {
            if (that.onError)
                that.onError.call(that.thisObject, msg);
        });
        socket.onMessage(function (res) {
            if (that.onSocketData) {
                if (res.data)
                    that.onSocketData.call(that.thisObject, res.data);
            }
        });
    }
}