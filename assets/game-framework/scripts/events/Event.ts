import { Event, EventTarget, Node } from "cc";

export class CustomEvent extends Event {
    public static DATA_CHANGE: string = "dataChanged";
    public static ITEM_SELECT: string = "itemSelect";
    public static PROP_INITED: string = 'CustomEvent.propInited';
    public static COMPONENT_ONLOAD: string = 'CustomEvent.OnLoad';

    public static CHANGE: string = "change";
    public static CHANGING: string = "changing";

    public static OPEN: string = "open";
    public static CLOSE: string = "close";
    public static LOAD: string = "loaded";
    public static CLOSE_POP: string = "CLOSE_POP";
    

    public data: any;

    _isDefaultPrevented: boolean = false;

    public constructor(type: string | number, bubbles?: boolean) {
        super(<string>type, bubbles);
    }

    public reuse(type?: string | number, bubbles?: boolean) {
        this._isDefaultPrevented = false;
        //@ts-ignore
        return super.reuse(type, bubbles);
    }

    public unuse() {
        this.data = null;
        return super.unuse();
    }


    public isDefaultPrevented(): boolean {
        return this._isDefaultPrevented;
    }

    public preventDefault(): void {
        this._isDefaultPrevented = true;
    }

    public static emit(target: EventTarget | Node, type: string | number, data?: any) {
        target.emit(<any>type, data);
    }

    public static dispatchEvent(target: Node, type: string | number, data?: any, bubbles?: boolean) {
        let event = CustomEvent.create(CustomEvent, type, bubbles);
        event.data = data;
        target.dispatchEvent(event);
        CustomEvent.release(event);
        return !event._isDefaultPrevented;
    }

    public static create<T extends CustomEvent>(
        EventClass: {
            new(type: string | number, bubbles?: boolean): T;
            eventPool?: CustomEvent[]
        }, type: string | number,
        bubbles?: boolean
    ): T {
        let eventPool: CustomEvent[];
        let hasEventPool = (EventClass as any).hasOwnProperty("eventPool");
        if (hasEventPool) {
            eventPool = EventClass.eventPool;
        }
        if (!eventPool) {
            eventPool = EventClass.eventPool = [];
        }
        if (eventPool.length) {
            let event: T = <T>eventPool.pop();
            event.reuse(type, bubbles);
            return event;
        }
        return new EventClass(type, bubbles);

    }

    public static release(event: CustomEvent): void {
        event.unuse();
        let EventClass: any = Object.getPrototypeOf(event).constructor;
        EventClass.eventPool.push(event);
    }
}

export class PropertyEvent extends CustomEvent {
    public static PROPERTY_CHANGE: string = "propertyChange";

    public property: string;

    public constructor(type: string, bubbles?: boolean, property?: string) {
        super(type, bubbles);
        this.property = property;
    }

    public static dispatchPropertyEvent(target: Node, type: string, property?: string) {
        if (!target.hasEventListener(type))
            return true;
        let event = CustomEvent.create(PropertyEvent, type);
        event.property = property;
        target.dispatchEvent(event);
        CustomEvent.release(event);
        return !event._isDefaultPrevented;
    }
}

export enum ArrayCollectionEventKind {
    RESET,
    REFRESH,
    ADD,
    REMOVE,
    UPDATE,
    REPLACE
}

export class ArrayCollectionEvent extends CustomEvent {
    kind: ArrayCollectionEventKind;
    index?: number;
    item?: any;
    oldItem?: any;

    unuse() {
        this.item = this.oldItem = null;
        return super.unuse();
    }
}