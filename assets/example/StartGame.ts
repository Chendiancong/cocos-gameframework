import { _decorator, Component } from 'cc';
import { GameInstance } from './GameInstance';
import { initGameFramework } from 'game-framework/scripts/framework-initial';
import { getGlobal } from 'game-framework/scripts/base/base';
const { ccclass, property } = _decorator;

@ccclass('StartGame')
export class StartGame extends Component {
    gameIns: GameInstance;

    start() {
        this.gameIns = new GameInstance();
        initGameFramework(this.gameIns);
        getGlobal().startGame = this;
    }
}