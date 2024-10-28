declare module 'cc' {
    // 扩展Component的定义
    interface Component {
        /** 等待一段时间 */
        exWaitSec(sec: number): Promise<void>;
        /** 等到一帧 */
        exWaitNextFrame(): Promise<void>;
        /** 等到一个条件 */
        exWaitUntil(predicate: () => boolean): Promise<void>;
        /** 执行函数直到job返回true */
        exDoJob(job: (dt: number) => boolean): Promise<void>;
    }
}