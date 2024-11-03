import { Camera, EventTarget } from "cc";
import { WECHAT } from "cc/env";
import { getGlobal } from "./base/base";
import { debugUtil } from "./base/debugUtil";
import { systemMgr } from "./base/SystemMgr";
import { ResMgr } from "./res/ResMgr";
import { timerCenter } from "./timer/TimerCenter";
import { AsyncWaiter } from "./utils/AsyncWaiter";
import { CommonStorage, WechatStorage } from "./utils/storage/GameLocalStorage";
import { LayerMgr } from "./view/LayerMgr";
import { ViewMgr } from "./view/ViewMgr";
import { default as cryptoJs } from 'crypto-js';
import { IGameInstance } from "./base/BaseGameInstance";

let isInited = false;

/** 框架预先初始化 */
export function initGameFramework(gameIns: IGameInstance) {
    if (isInited)
        return;
    isInited = true;
    const global = getGlobal();
    const gf = global.gFramework;

    gf.log = debugUtil.log;
    gf.forceLog = debugUtil.force_log;
    gf.warn = debugUtil.warn;
    gf.error = debugUtil.error;
    gf.assert = debugUtil.assert;

    gf.cryptoJs = cryptoJs;
    gf.gameIns = gameIns;
    gf.resMgr = new ResMgr();
    gf.layerMgr = new LayerMgr();
    gf.viewMgr = new ViewMgr();
    gf.systemMgr = systemMgr;
    gf.timerCenter = timerCenter;
    if (WECHAT)
        gf.localStorage = new WechatStorage();
    else
        gf.localStorage = new CommonStorage();
    gf.globalEvent = new EventTarget();
    gf.waiter = new AsyncWaiter();
    gf.soundPlayer = new DefaultSoundPlayer();

    postInit(gameIns);
}

function postInit(gameIns: IGameInstance) {
    gFramework.layerMgr.init(gameIns);
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