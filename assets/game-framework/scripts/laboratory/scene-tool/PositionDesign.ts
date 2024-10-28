import { CCObject, Component, IVec3Like, Node, Vec3, _decorator, murmurhash2_32_gc } from "cc";
import { aspects } from "game-framework/scripts/utils/Aspects";
import { getSimpleUuid } from "game-framework/scripts/base/uuid";
import { PositionDesignPreview } from "./PositionDesignPreview";

const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('PositionDesign.PositionRecord')
class PositionRecord {
    @property({ readonly: true })
    id: string = '';
    @property({ readonly: true })
    pos: Vec3 = new Vec3();
}

@ccclass('PositionDesign')
@executeInEditMode
export class PositionDesign extends Component {
    @property({ type: [PositionRecord], readonly: true })
    records: PositionRecord[] = [];
    @property({ displayName: '增加一个位置' })
    get createNewPos() { return false; }
    set createNewPos(value: boolean) {
        if (value && aspects.checkEditor()) {
            let randomId = 'Pos' + murmurhash2_32_gc(Date.now().toString(16), 1024);
            const node = new Node(randomId);
            node._objFlags = CCObject.Flags.DontSave;
            node.addComponent(PositionDesignPreview);
            node.setParent(this.node, true);
        }
    }
    @property({ displayName: '保存位置编辑' })
    get save() { return false; }
    set save(value: boolean) {
        if (value && aspects.checkEditor()) {
            this._onSave();
        }
    }

    private _recordDic: Record<string, PositionRecord> = {};

    getPosition(id: string): Readonly<Vec3> {
        return this._recordDic[id]?.pos ?? Vec3.ZERO;
    }

    protected onLoad() {
        if (aspects.checkEditor()) {
            this._initPosDesignNodes();
            // cce.Scene.on('save', this._onSave);
        } else {
            this.records.forEach(r => this._recordDic[r.id] = r);
        }
    }

    protected onDestroy() {
        if (aspects.checkEditor()) {
            cce.Scene.off('save', this._onSave);
        }
    }

    private _initPosDesignNodes() {
        for (const record of this.records) {
            const node = new Node(record.id);
            node._objFlags = CCObject.Flags.DontSave;
            node.setPosition(record.pos);
            node.setParent(this.node, true);
            node.addComponent(PositionDesignPreview);
        }
    }

    private _onSave = () => {
        console.log('on scene save');
        const pool = Array.from(this.records);
        const newRecords: PositionRecord[] = [];
        const idMap = new Set<string>();
        for (const node of this.node.children) {
            if (idMap.has(node.name))
                console.warn(`PositionDesign:same position id ${node.name}`);
            idMap.add(node.name);
            let r: PositionRecord;
            if (pool.length > 0)
                r = pool.pop();
            else
                r = new PositionRecord();
            r.id = node.name;
            r.pos.set(node.worldPosition);
            newRecords.push(r);
        }
        this.records = newRecords;
    }
}