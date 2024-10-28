import { _decorator, CCInteger, Component, director, Node } from 'cc';
import { mixinPoolItem, PoolManager } from 'game-framework/scripts/base/ObjectPool';
import { debugUtil } from 'game-framework/scripts/base/debugUtil';
import { getSimpleUuid } from 'game-framework/scripts/base/uuid';
const { ccclass, property } = _decorator;

const enum JobSystemState {
    Free,
    Busy,
    Yield
}

@ccclass('XJobSystem')
export class XJobSystem extends Component {
    private static _ins: XJobSystem;
    static get ins() {
        if (!this._ins?.isValid) {
            const node = new Node('$XJobSystem');
            node.addComponent(XJobSystem);
            node.parent = director.getScene();
        }
        return this._ins;
    }

    @property({ type: CCInteger, min: 0, tooltip: '两次作业的间隔时间（毫秒）' })
    interval: number = 0;
    @property({ type: CCInteger, min: 40, tooltip: '单次作业的持续时间限制（毫秒）' })
    slotDuration: number = 40;

    private _startTime: number = 0;
    private _endTime: number = 0;
    private _nextTime: number = 0;

    private _state = JobSystemState.Free;
    private _jobItems: XJobItem[] = [];

    /**
     * 增加一个作业
     * @returns 作业id
     */
    addJob<TF extends Function, TCaller = void>({ job, caller }: { job: TF, caller?: TCaller }, ...args: (TF extends (..._: infer R) => void|any ? R : any)) {
        const item = PoolManager.getItem(XJobItem);
        const jobId = getSimpleUuid();
        item.jobId = jobId;
        item.job = job;
        item.that = caller ?? void 0;
        item.args = args;
        this._jobItems.push(item);
        return jobId;
    }

    protected onLoad() {
        XJobSystem._ins = this;
    }

    protected update(dt: number) {
        this._resumeJob();
    }

    protected onDestroy() {
        for (const j of this._jobItems)
            PoolManager.pushItem(j);
        this._jobItems.length = 0;
        this._pauseJob();
    }

    private _resumeJob() {
        do {
            const state = this._state;
            if (state === JobSystemState.Free) {
                if (this._jobItems.length)
                    this._nextJob();
                break;
            }
            if (state === JobSystemState.Yield) {
                if (performance.now() >= this._nextTime)
                    this._nextJob();
                break;
            }
        } while (false);
    }

    private _yieldJob() {
        if (this._state === JobSystemState.Busy) {
            this._state = JobSystemState.Yield;
            this._nextTime = performance.now() + this.interval;
        }
    }

    private _pauseJob() {
        this._state = JobSystemState.Free;
    }

    private _nextJob(p?: Promise<void>) {
        p = p ?? Promise.resolve();
        // 在微任务流中执行
        p.then(() => this._doNextJob(p));
    }

    private _doNextJob = (p: Promise<void>) => {
        if (this._state !== JobSystemState.Busy) {
            this._startTime = performance.now();
            this._endTime = this._startTime + this.slotDuration;
        }
        this._state = JobSystemState.Busy;
        if (this._jobItems.length) {
            const curJob = this._jobItems.shift();
            try {
                const ret = curJob.execute();
                if (ret instanceof Promise) {
                    ret.then(() => {
                        PoolManager.pushItem(curJob);
                        // this._tryNextJob(p);
                        this._tryNextJob(void 0);
                    });
                } else {
                    PoolManager.pushItem(curJob);
                    this._tryNextJob(p);
                }
            } catch (e) {
                gFramework.error(e);
                this._yieldJob();
            }
        } else {
            this._pauseJob();
        }
    }

    private _tryNextJob(p?: Promise<void>) {
        const now = performance.now();
        if (now >= this._endTime) {
            debugUtil.log(`previous xjobs cost ${now - this._startTime}`);
            this._yieldJob();
            return false;
        } else {
            this._nextJob(p);
            return true;
        }
    }
}

interface XJobItem extends gFramework.IPoolItem { }

@ccclass('XJobSystem.XJobItem')
@mixinPoolItem
class XJobItem implements gFramework.IPoolItem {
    jobId: string;
    job: Function;
    that?: any;
    args?: any[]|any;

    execute() {
        if (this.args == void 0)
            return this.job.call(this.that ?? void 0);
        else if (Array.isArray(this.args))
            return this.job.call(this.that ?? void 0, ...this.args);
        else
            return this.job.call(this.that ?? void 0);
    }

    onPoolRestore() {
        delete this.jobId;
        delete this.job;
    }
}