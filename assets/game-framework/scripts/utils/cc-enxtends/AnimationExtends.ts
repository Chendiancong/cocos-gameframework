import { Animation } from "cc";
import { applyMixins } from "game-framework/scripts/base/jsUtil";
import { defer } from "game-framework/scripts/base/promise";

export class CCAnimationExtends implements CCExtends.AnimationExtends {
    getDuration(this: Animation, clipName: string): number {
        const state = this.getState(clipName);
        return state ? state.clip.duration / Math.max(1e-5, state.clip.speed) : 0;
    }

    getUnscaledDuration(this: Animation, clipName: string): number {
        const state = this.getState(clipName);
        return state ? state.clip.duration : 0;
    }

    async playOneTime(this: Animation, clipName: string) {
        if (!this.isValid)
            return this;
        if (!this.getState(clipName))
            return this;
        const d = defer<Animation>();
        const f = () => {
            this.off(Animation.EventType.FINISHED, f, this);
            this.off(Animation.EventType.LASTFRAME, f, this);
            d.resolve(this);
        }
        this.once(Animation.EventType.FINISHED, f, this);
        this.once(Animation.EventType.LASTFRAME, f, this);
        this.play(clipName);
        await d.promise;
        return this;
    }
}

applyMixins(Animation, [CCAnimationExtends]);