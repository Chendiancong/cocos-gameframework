import { _decorator, CCObject, clamp01, Color, Component, Material, Node } from 'cc';
import { EDITOR } from 'cc/env';
import { Bar3d } from '../../scripts/Bar3d';
const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('HpBar3d.ProgressSize')
class HpBarInfo {
    @property({ min: 0.01 })
    width: number = 1;
    @property({ min: 0.01 })
    height: number = 0.2
    @property(Color)
    color = new Color(Color.WHITE);
}

@ccclass('HpBar3d')
@executeInEditMode
export class HpBar3d extends Component {
    @property(Material)
    hpMaterial: Material = null;
    @property(HpBarInfo)
    frontInfo: HpBarInfo = new HpBarInfo();
    @property(HpBarInfo)
    backgroundInfo: HpBarInfo = new HpBarInfo();
    @property
    useGpuInstance: boolean = true;

    private _frontBar: Bar3d;
    private _backgroundBar: Bar3d;
    private _value = 1;
    @property({ range: [0, 1] })
    get value() { return this._value; }
    set value(v: number) {
        v = clamp01(v);
        this._value = v;
        this._onValueChange();
    }

    @property
    get rebuild() { return false; }
    set rebuild(value: boolean) {
        if (value && EDITOR)
            this._createBar();
    }

    start() {
        this._createBar();
    }

    private _createBar() {
        this._frontBar?.node.destroy();
        this._backgroundBar?.node.destroy();

        const frontNode = new Node('$Front');
        const backgroundNode = new Node('$Background');
        // frontNode._objFlags |= CCObject.Flags.DontSave|CCObject.Flags.HideInHierarchy|CCObject.Flags.LockedInEditor;
        // backgroundNode._objFlags |= CCObject.Flags.DontSave|CCObject.Flags.HideInHierarchy|CCObject.Flags.LockedInEditor;
        frontNode._objFlags |= CCObject.Flags.DontSave;
        backgroundNode._objFlags |= CCObject.Flags.DontSave;

        frontNode.parent = backgroundNode.parent = this.node;
        this._frontBar = frontNode.addComponent(Bar3d);
        this._backgroundBar = backgroundNode.addComponent(Bar3d);
        this._frontBar.autoCreate = this._backgroundBar.autoCreate = false;

        let curBar = this._backgroundBar;
        curBar.material = this.hpMaterial;
        curBar.width = this.backgroundInfo.width;
        curBar.height = this.backgroundInfo.height;
        curBar.barColor.set(this.backgroundInfo.color);
        curBar.gpuInstance = this.useGpuInstance;
        curBar.createBar();

        curBar = this._frontBar;
        curBar.material = this.hpMaterial;
        curBar.width = Math.min(this.backgroundInfo.width, this.frontInfo.width);
        curBar.height = Math.min(this.backgroundInfo.height, this.frontInfo.height);
        curBar.barColor.set(this.frontInfo.color);
        curBar.gpuInstance = this.useGpuInstance;
        curBar.createBar();
        curBar.node.setPosition(0, 0, 0.01);

        this._onValueChange();
    }

    private _onValueChange() {
        // if (this._progressValueHandle)
        //     this._progressPass.setUniform(this._progressValueHandle, this._value);
        if (this._frontBar?.isValid)
            this._frontBar.progressValue = this._value;
    }
}

