import { _decorator, Component } from 'cc';
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
}