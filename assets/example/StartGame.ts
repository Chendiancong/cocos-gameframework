import { _decorator, Asset, assetManager, Component, SpriteFrame } from 'cc';
import { GameInstance } from './GameInstance';
import { initGameFramework } from 'game-framework/scripts/framework-initial';
import { getGlobal } from 'game-framework/scripts/base/base';
import { MainUI1 } from './MainUI1';
import { MainUI2 } from './MainUI2';
const { ccclass } = _decorator;

@ccclass('StartGame')
export class StartGame extends Component {
    gameIns: GameInstance;

    start() {
        this.gameIns = new GameInstance();
        initGameFramework(this.gameIns);
        getGlobal().startGame = this;
    }

    openMainUI1() {
        gFramework.viewMgr.open(MainUI1);
    }

    closeMainUI1() {
        gFramework.viewMgr.close(MainUI1);
    }

    openMainUI2() {
        gFramework.viewMgr.open(MainUI2)
    }

    closeMainUI2() {
        gFramework.viewMgr.close(MainUI2);
    }


    private _asset: Asset;
    async testLoadRes() {
        this._asset = await gFramework.resMgr.aloadRes<SpriteFrame>('fgui/main_atlas0/spriteFrame');
        gFramework.log('asset loaded', this._asset);
    }

    testReleaseRes() {
        if (this._asset?.isValid) {
            const toRelease = this._asset;
            delete this._asset;
            assetManager.releaseAsset(toRelease);
        }
    }

    testParams(a: number, b?: number, c: number = 1) {
        console.log(a, b, c);
    }
}