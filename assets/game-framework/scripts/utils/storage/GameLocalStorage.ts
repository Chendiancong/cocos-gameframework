import { sys } from "cc";

export class CommonStorage implements gFramework.IStorage {
    setItem(key: string, value: string) {
        sys.localStorage.setItem(key, value);
    }

    getItem(key: string): string {
        return sys.localStorage.getItem(key);
    }

    removeItem(key: string) {
        sys.localStorage.removeItem(key);
    }

    clear() {
        sys.localStorage.clear();
    }
}

export class WechatStorage implements gFramework.IStorage {
    setItem(key: string, value: string) {
        wx.setStorageSync(key, value);
    }

    getItem(key: string): string {
        return wx.getStorageSync(key);
    }

    removeItem(key: string) {
        wx.removeStorageSync(key);
    }

    clear() {
        wx.clearStorageSync();
    }
}