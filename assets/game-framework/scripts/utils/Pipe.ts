import { ILinkedListNode, LinkedList } from "./data/LinkedList";

export class Pipe {
    static create<TIn, TOut, TCaller = void>(func: (arg: TIn) => TOut, caller?: TCaller) {
        return new PipeState<TIn, TOut, TCaller>(func, caller);
    }
}

export interface IInnerPipeState extends ILinkedListNode {
    stateLists: LinkedList<IInnerPipeState>;
    innerF: Function;
    innerCaller?: any;

    innerExecute(arg: any, that?: any): any;
    innerAppend<TFinalOut, TNextCaller = void>(f: (arg: any) => TFinalOut, caller?: TNextCaller): IInnerPipeState;
}

export interface IPipeState<TIn, TOut, TCaller = void> {
    f: (arg: TIn) => TOut;
    caller: TCaller;

    execute(arg: TIn, that?: TCaller): TOut;
    append<TNextOut, TNextCaller = void>(f: (arg: TOut) => TNextOut, caller?: TNextCaller): IPipeState<TIn, TNextOut, TNextCaller>;
}

class PipeState<TIn, TOut, TCaller = void> implements IInnerPipeState, IPipeState<TIn, TOut, TCaller> {
    next: IInnerPipeState;
    prev: IInnerPipeState;
    stateLists: LinkedList<IInnerPipeState>;
    innerF: Function;
    innerCaller?: TCaller;

    get f() { return this.innerF as (arg: TIn) => TOut; }
    get caller() { return this.innerCaller as TCaller; }
    get execute() { return this.innerExecute as (arg: TIn) => TOut; }

    constructor(func: Function, caller: any, source?: IInnerPipeState) {
        this.innerF = func;
        this.innerCaller = caller;

        if (source)
            this.stateLists = source.stateLists;
        else
            this.stateLists = new LinkedList<IInnerPipeState>();

        this.stateLists.add(this);
    }

    innerExecute(arg: any, that?: any) {
        let ret = arg;
        for (const state of this.stateLists.values())
            ret = state.innerF.call(that ?? state.innerCaller ?? void 0, ret);
        return ret;
    }

    innerAppend<TNextOut, TNextCaller = void>(f: (arg: any) => TNextOut, caller?: TNextCaller) {
        const nextState = new PipeState<any, TNextOut, TNextCaller>(f, caller, this as IInnerPipeState);
        return nextState;
    }

    append<TNextOut, TNextCaller = void>(f: (arg: TOut) => TNextOut, caller?: TNextCaller) {
        return this.innerAppend(f, caller) as PipeState<TIn, TNextOut, TNextCaller>;
    }
}