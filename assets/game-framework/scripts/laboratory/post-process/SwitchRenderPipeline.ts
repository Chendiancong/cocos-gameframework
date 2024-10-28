import { _decorator, Component, director, js } from 'cc';
import { getGlobal } from 'game-framework/scripts/base/base';
const { ccclass } = _decorator;

@ccclass('SwitchRenderPipeline')
export class SwitchRenderPipeline extends Component {
    protected onLoad() {
        getGlobal().pipelineSwitcher = this;
    }

    switchToExForwardPipeline() {
        const ExForwardPipeline = js.getClassByName('ExForwardPipeline');
        if (ExForwardPipeline) {
            const ppl = new ExForwardPipeline();
            // @ts-ignore
            ppl.initialize({ flows: [] });
            // @ts-ignore
            director.root.setRenderPipeline(ppl);
        }
    }

    switchToOriginPipeline() {
        const ForwardPipeline = js.getClassByName('ForwardPipeline');
        if (ForwardPipeline) {
            const ppl = new ForwardPipeline();
            // @ts-ignore
            ppl.initialize({ flows: [] });
            // @ts-ignore
            director.root.setRenderPipeline(ppl);
        }
    }
}