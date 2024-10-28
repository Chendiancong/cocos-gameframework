import { color, Color, Component, _decorator, renderer, Light, approx} from "cc";
import { EDITOR } from "cc/env";
import { logicLightUtil } from "./LogicLightUtil";

const { ccclass, property, requireComponent, executeInEditMode } = _decorator;

const tempColor = color();

@ccclass("LogicLight")
@requireComponent(Light)
@executeInEditMode
export class LogicLight extends Component {
    static readonly EVENTS = {
        ON_VISIBLE_CHANGE: 'on-visible-change',
        ON_SIZE_CHANGE: 'on-size-change',
        ON_RANGE_CHANGE: 'on-range-change',
        ON_COLOR_CHANGE: 'on-color-change'
    }

    private static _lightDummy: boolean = true;
    private static _allLights: LogicLight[] = [];
    private static _validLights: LogicLight[] = [];

    @property
    lightMeterScale: number = 10000.0;
    @property
    autoDisableLight: boolean = true;

    private _light: Light;
    private _visible: boolean = true;
    private _size: number = 0.15;
    private _range: number = 2;
    private _color: Color = color();

    static get allLights() {
        if (this._lightDummy)
            this._validPunctualLightsCulling();
        return this._validLights;
    }

    get light() {
        if (this._light == void 0)
            this._light = this.getComponent(Light);
        return this._light;
    }
    get sceneLight(): renderer.scene.Light {
        let light = this.light;
        return light["_light"];
    }

    get visible() {
        return this._visible;
    }
    set visible(value: boolean) {
        if (this._visible != value) {
            this._visible = value;
            this.node.emit(LogicLight.EVENTS.ON_VISIBLE_CHANGE, value);
        }
    }

    get size() {
        return this._size;
    }
    set size(value: number) {
        let oldSize = this._size;
        this._size = oldSize;
        if (!approx(oldSize, value))
            this.node.emit(LogicLight.EVENTS.ON_SIZE_CHANGE, value);
    }

    get range() {
        return this._range;
    }
    set range(value: number) {
        let oldRange = this._range;
        this._range = value;
        if (!approx(oldRange, value))
            this.node.emit(LogicLight.EVENTS.ON_RANGE_CHANGE, value);
    }

    get color(): Readonly<Color> {
        return this._color;
    }
    set color(value: Readonly<Color>) {
        tempColor.set(this._color);
        this._color.set(value);
        if (!tempColor.equals(value))
            this.node.emit(LogicLight.EVENTS.ON_COLOR_CHANGE, value);
    }

    private static _validPunctualLightsCulling() {
        let validLights = this._validLights;
        let allLights = this._allLights;
        validLights.length = allLights.length;
        for (let i = 0, len = allLights.length; i < len; ++i)
            validLights[i] = allLights[i];
    }

    start() {
        if (!EDITOR && this.autoDisableLight)
            this.light.enabled = false;
    }

    onEnable() {
        LogicLight._allLights.push(this);
        LogicLight._lightDummy = true;
    }

    onDisable() {
        let lights = LogicLight._allLights;
        let idx = lights.indexOf(this);
        if (idx >= 0)
            lights[idx] = null;
        logicLightUtil.arrayRemove(lights, null);
        LogicLight._lightDummy = true;
    }
}