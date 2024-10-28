import { applyMixins } from "../../base/jsUtil";
import { Setable } from "./SetableClass";

export class ComplexValue {
    settings = {};

    getFalse(): string {
        let settings = this.settings;
        for (let key in settings) {
            if (!settings[key]) return key;
        }
        return "";
    }

    hasFalse(): boolean {
        let settings = this.settings;
        for (let key in settings) {
            if (!settings[key]) return true;
        }
        return false;
    }
}

export interface ComplexValue extends Setable {}

applyMixins(ComplexValue, [Setable]);
