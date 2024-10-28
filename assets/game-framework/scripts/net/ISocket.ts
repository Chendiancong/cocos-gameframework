export interface ISocket {
    /** 链接 */
    connect(host: string, port: number): void;

    /** 链接 */
    connectByUrl(url: string): void;

    addCallBacks(onConnect: Function, onClose: Function, onSocketData: Function, onError: Function, thisObject: any): void;

    send(message: any): void;

    close(): void;

    disconnect(): void;
}