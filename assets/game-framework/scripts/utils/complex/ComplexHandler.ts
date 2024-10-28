import { applyMixins } from "../../base/jsUtil";
import { Setable } from "./SetableClass";

export class ComplexHandler {
    settings = {};

    setMethod(method: Function) {
        this.set("method", method);
        return this;
    }

    invoke() {
        if (this.hasFalse()) {
            return false;
        }

        let method = this.get("method");
        if (!!method)
            method.call(this);

        return true;
    }

    hasFalse(): boolean {
        let settings = this.settings;
        for (let key in settings) {
            if (key === "method")
                continue;

            if (!settings[key])
                return true;
        }

        return false;
    }

    reset(): void {
        let settings = this.settings;
        for (let key in settings) {
            if (key === "method")
                continue;

            settings[key] = false;
        }
    }
}

export interface ComplexHandler extends Setable {}
applyMixins(ComplexHandler, [Setable]);
