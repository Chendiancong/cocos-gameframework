import { director, Node, UITransform } from "cc";
import { BaseGameInstance, ExecuteGMResult, HeartBeatData } from "game-framework/scripts/base/BaseGameInstance";
import { GameNet, ReturnOfNetCall } from "game-framework/scripts/net/GameNet";
import { FullScreen } from "game-framework/scripts/utils/node/FullScreen";

export class GameInstance extends BaseGameInstance {
    get enableSocketDataHook(): boolean { return false; }
    get networkHookCtor() { return void 0; }
    get uiRootNode() {
        if (this._uiRoot?.isValid)
            return this._uiRoot;
        const canvas = director.getScene().getChildByName('Canvas');
        gFramework.assert(canvas?.isValid);

        let uiRoot = canvas.getChildByName('fRoot');
        if (!uiRoot?.isValid) {
            uiRoot = new Node('fRoot');
            uiRoot.setParent(canvas);
            uiRoot.addComponent(UITransform);
            uiRoot.addComponent(FullScreen);
        }
        this._uiRoot = uiRoot;

        return this._uiRoot;
    }

    private _uiRoot: Node;

    constructor() {
        super();
    }

    gm(cmd: string, cb?: (ret: ExecuteGMResult) => void): void {
        gFramework.log(`gm ${cmd}`);
        cb(ExecuteGMResult.Success);
    }

    heartBeat(gameNet: GameNet, success?: (data: HeartBeatData) => void, failure?: (code: number) => void): ReturnOfNetCall {
        return 0; 
    }
}