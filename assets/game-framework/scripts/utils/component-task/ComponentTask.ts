import { CCObject, Component } from "cc";
import { defer } from "../../base/promise";
import { applyMixins } from "game-framework/scripts/base/jsUtil";
import { gameTime } from "../time/GameTime";

type LifeStyleFunc = 'onLoad'|'start';

class ExtendsComponent {
    exWaitSec(this: Component, sec: number) {
        const d = defer<void>();
        this.scheduleOnce(() => d.resolve(), sec);
        return d.promise;
    }

    exWaitNextFrame(this: Component) {
        const d = defer<void>();
        this.scheduleOnce(() => d.resolve(), 0);
        return d.promise;
    }

    exWaitUntil(this: Component, predicate: () => boolean) {
        const d = defer<void>();
        const func = () => {
            if (predicate()) {
                this.unschedule(func);
                d.resolve();
            }
        }
        this.schedule(func);
        return d.promise;
    }

    exDoJob(this: Component, job: (dt: number) => boolean) {
        const d = defer<void>();
        const func = () => {
            const ret = job(gameTime.deltaTime);
            if (ret) {
                d.resolve();
                this.unschedule(func);
            }
        };
        this.schedule(func);
        return d.promise;
    }
}

applyMixins(Component, [ExtendsComponent])