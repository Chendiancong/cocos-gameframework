var crypto: Crypto;

export function getUuid() {
    if (crypto != void 0) {
        if (typeof crypto === 'object') {
            if (typeof crypto.randomUUID === 'function') {
                return crypto.randomUUID();
            }
        }
        if (typeof crypto.getRandomValues === 'function' && typeof Uint8Array === 'function') {
            const callback = (c) => {
                const num = Number(c);
                return (num ^ (crypto.getRandomValues(new Uint8Array(1)))[0] & (15 >> (num / 4))).toString(16);
            };
            return (''+1e7 + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, callback);
        }
    }

    let timestamp = new Date().getTime();
    let perforNow = (typeof performance !== 'undefined' && performance.now && performance.now() * 1000) || 0;
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        let random = Math.random() * 16;
        if (timestamp > 0) {
        random = (timestamp + random) % 16 | 0;
        timestamp = Math.floor(timestamp / 16);
        } else {
        random = (perforNow + random) % 16 | 0;
        perforNow = Math.floor(perforNow / 16);
        }
        return (c === 'x' ? random : (random & 0x3) | 0x8).toString(16);
    });
}

let seed = 1.1;
function seededRandom(min: number, max: number) {
    max = max || 1;
    min = min || 0;
    seed = (seed * 9301 + 49297) % 233280;
    const rnd = seed / 233280.0;
    return min + rnd * (max - min);
}

export function getSimpleUuid() {
    return seededRandom(0, 1)
        .toString(36)
        .replace(/^[0\.]+/, '')
        .padStart(11, '0')
        .toLowerCase();
}