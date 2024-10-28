import { Camera, EventTarget } from "cc";
import { WECHAT } from "cc/env";
import { getGlobal } from "./base/base";
import { debugUtil } from "./base/debugUtil";
import { systemMgr } from "./base/SystemMgr";
import * as net from "./net/GameNet";
import { ResMgr } from "./res/ResMgr";
import { timerCenter } from "./timer/TimerCenter";
import { AsyncWaiter } from "./utils/AsyncWaiter";
import { CommonStorage, WechatStorage } from "./utils/storage/GameLocalStorage";
import { LayerMgr } from "./view/LayerMgr";
import { ViewMgr } from "./view/ViewMgr";
import { default as cryptoJs } from 'crypto-js';
import { IGameInstance } from "./base/GameInstance";

let isInited = false;

/** 框架预先初始化 */
export function initGameFramework(gameIns: IGameInstance) {
    if (isInited)
        return;
    isInited = true;
    const global = getGlobal();
    const gf = global.gFramework;
    gf.gameIns = gameIns;
    gf.resMgr = new ResMgr();
    gf.layerMgr = new LayerMgr();
    gf.viewMgr = new ViewMgr();
    gf.systemMgr = systemMgr;
    getGlobal().Net = gf.net = net;
    gf.timerCenter = timerCenter;
    if (WECHAT)
        gf.localStorage = new WechatStorage();
    else
        gf.localStorage = new CommonStorage();
    gf.globalEvent = new EventTarget();
    gf.waiter = new AsyncWaiter();
    gf.showTips = function () {
        console.log(...arguments);
    }
    gf.showAnnounce = function () {
        console.log(...arguments);
    }
    gf.showShili = function () {
        console.log(...arguments);
    }
    gf.showFloatAwardEff = function () {
        console.log(...arguments);
    }
    gf.showAddAwardEff = function () {
        console.log(...arguments);
    }
    gf.showItemTips = function () {
        console.log(...arguments);
    }
    gf.showEquipTips = function () {
        console.log(...arguments);
    }
    gf.showFaBaoTips = function () {
        console.log(...arguments);
    }
    gf.showDescTips = function () {
        console.log(...arguments);
    }
    gf.hideDescTips = function () {
        console.log(...arguments);
    }
    gf.showSpineEff = function () {
        console.log(...arguments);
    }
    gf.showAnnounce = function () {
        console.log(...arguments);
    }
    gf.log = debugUtil.log;
    gf.forceLog = debugUtil.force_log;
    gf.warn = debugUtil.warn;
    gf.error = debugUtil.error;
    gf.assert = debugUtil.assert;
    gf.soundPlayer = new DefaultSoundPlayer();
    gf.cryptoJs = cryptoJs;
}

export function setGameFrameworkSoundPlayer(soundPlayer: gFramework.IGameSoundPlayer) {
    const gf = getGlobal().gFramework;
    gf.soundPlayer = soundPlayer;
}

export function setGameFrameworkUseGM(flag: boolean) {
    const gf = getGlobal().gFramework;
    gf.useGM = flag;
}

export function setUICamera(cam: Camera) {
    const gf = getGlobal().gFramework;
    gf.uiCamera = cam;
}

class DefaultSoundPlayer implements gFramework.IGameSoundPlayer {
    playSound(soundName: string, option?: any) { }

    playMusic(soundName: string, option?: any) { }

    playUISound(soundName: string, option?: any) { }

    setMusic(isOn: boolean) { }

    setEffect(isOn: boolean) { }
}