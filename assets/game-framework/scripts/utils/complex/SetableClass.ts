export class Setable {
    settings = {};

    set(key: any, value: any, attach: boolean = false): Setable {
        this.settings[key] = value;
        if (attach) {
            this[key] = value;
        }
        return this;
    }

    get(key: any): any {
        return this.settings[key];
    }

    remove(key: any): void {
        delete this.settings[key];
    }

    enable(key: any): Setable {
        return this.set(key, true);
    }

    disable(key: any): Setable {
        return this.set(key, false);
    }

    enabled(key: any): boolean {
        return !!this.get(key);
    }

    disabled(key: any): boolean {
        return !this.get(key);
    }

    toString() {
        return buildQueryString(this.settings);
    }
}

function buildQueryString(obj: any) {
    var esc = encodeURIComponent;
    return Object.keys(obj).sort().map(function (k) {
        return esc(k) + '=' + esc(obj[k]);
    }).join('&');
}
