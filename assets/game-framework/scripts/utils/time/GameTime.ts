import { game } from "cc";
import { IDelegate, asDelegate } from "game-framework/scripts/base/Delegate";

export class GameTime {
    private _timeSpeed = 1;

    @asDelegate
    onSpeedChange: IDelegate<(timeSpeed: number) => void>;

    get totalTimeMs() {
        return game.totalTime;
    }

    get totalTime() {
        return this.totalTimeMs / 1000;
    }

    get deltaTime() {
        return game.deltaTime * this._timeSpeed;
    }

    get deltaTimeMs() {
        return this.deltaTime * 1000;
    }

    get unscaleDeltaTime() {
        return game.deltaTime;
    }

    get unscaleDeltaTimeMs() {
        return game.deltaTime * 1000;
    }

    get timeSpeed() { return this._timeSpeed; }
    set timeSpeed(value: number) {
        if (Math.abs(value - this._timeSpeed) < 1e-5) {
            this._timeSpeed = value;
            this.onSpeedChange.entry(value);
        }
    }
}

export const gameTime = new GameTime();