import { VERSION } from "cc";
import { DEBUG, EDITOR } from "cc/env"

type ErrorHandler = (e: Error) => void;
type ProfilerTag = string|((...funcArgs: any[]) => string);
type TryCacheOption = {
    catcher?: ErrorHandler,
    activeInRelease?: boolean
}
type FuncPropOption = {
    async?: boolean,
}

const kAsyncFuncKey = '__isAsyncFunc';

function defaultCatcher(e: Error, ...args) {
    console.error("defaultCatcher", e, ...args)
}

function runWithTryCache<T extends Function>(func: T, option: TryCacheOption) {
    if (!DEBUG && !option.activeInRelease)
        return func;
    else {
        return function () {
            try {
                return func.call(this, ...arguments);
            } catch (e) {
                const catcher = option.catcher??defaultCatcher;
                catcher.call(this, e, ...arguments);
            }
        }
    }
}

function trycatch(option: TryCacheOption);
function trycatch(clazzOrProto: any, methodName: string, desc: PropertyDescriptor);
function trycatch(...args: any[]) {
    let option: TryCacheOption;
    function internal(clazzOrProto: any, methodName: string, desc: PropertyDescriptor) {
        if (!DEBUG && !option.activeInRelease)
            return;
        const func = desc.value;
        if (func[kAsyncFuncKey])
            desc.value = _createFunc(
                async function () {
                    try {
                        let ret = func.call(this, ...arguments);
                        await ret;
                        return ret;
                    } catch (e) {
                        const catcher = option.catcher??defaultCatcher;
                        catcher.call(this, e, ...arguments);
                    }
                },
                func
            )
        else
            desc.value = _createFunc(
                function () {
                    try {
                        let ret = undefined;
                        ret = func.call(this, ...arguments);
                        return ret;
                    } catch (e) {
                        const catcher = option.catcher??defaultCatcher;
                        catcher.call(this, e, ...arguments);
                    }
                },
                func
            );
    }

    const argLen = args.length;
    if (argLen == 1) {
        option = argLen[0];
        return internal;
    } else {
        option = Object.create(null);
        internal(args[0], args[1], args[2]);
    }
}

function profiler(tag: ProfilerTag, activeInRelease: boolean = true) {
    return function (clazzOrProto: any, methodName: string, desc: PropertyDescriptor) {
        if (!DEBUG && !activeInRelease)
            return;
        const func = desc.value as Function;
        desc.value = _createFunc(
            function () {
                const now = performance.now();
                const ret = func.call(this, ...arguments);
                const _tag = _convertProfilerTag(tag, this, ...arguments);
                if (ret instanceof Promise)
                    ret.then(() => console.log(_createProfilerMsg(_tag, now)));
                else
                    console.log(_createProfilerMsg(_tag, now));
                return ret;
            },
            func
        );
    }
}

function runWithProfiler<T extends Function>(func: T, tag: ProfilerTag, activeInRelease: boolean = true) {
    if (!DEBUG && !activeInRelease)
        return func;
    else
        return function () {
            const now = performance.now();
            const ret = func.call(this);
            const _tag = _convertProfilerTag(tag, this, ...arguments);
            if (ret instanceof Promise)
                ret.then(() => console.log(_createProfilerMsg(_tag, now)));
            else
                console.log(_createProfilerMsg(_tag, now));
            return ret;
        } as Function as T;
}

function checkEditor(throwError?: boolean) {
    if (!EDITOR && throwError)
        throw new Error('Only in editor mode!');
    return EDITOR;
}

function checkDebug(throwError?: boolean) {
    if (!DEBUG && throwError)
        throw new Error('Only in debug mode!');
    return DEBUG;
}


function editor(throwError?: boolean);
function editor(clazzOrProto: any, methodName: string, desc: PropertyDescriptor);
function editor(...args: any[]) {
    let throwError: boolean = false;
    function internal (clazzOrProto: any, methodName: string, desc: PropertyDescriptor) {
        const func = desc.value;
        desc.value = _createFunc(
            function () {
                if (checkEditor(throwError))
                    return func.call(this, ...arguments);
                else {
                    console.log(`${clazzOrProto.name}.${methodName} just run in editor mode`);
                    return _noReturn(func);
                }
            },
            func
        );
    }

    if (args.length == 1) {
        throwError = args[0];
        return internal;
    } else {
        throwError = false;
        internal(args[0], args[1], args[2]);
    }
}

function runtime(clazzOrPorto: any, methodName: string, desc: PropertyDescriptor) {
    const func = desc.value;
    desc.value = _createFunc(
        function () {
            if (EDITOR)
                return _noReturn(func);
            return func.call(this, ...arguments);
        },
        func
    );
}

function debug(clazzOrProto: any, methodName: string, desc: PropertyDescriptor) {
    const func = desc.value;
    desc.value = _createFunc(
        function () {
            if (DEBUG)
                return _noReturn(func);
            return func.call(this, ...arguments);
        },
        func
    );
}

function checkEngineVersion(versionPatterns: (RegExp|string)[]|RegExp|string, throwError?: boolean) {
    const engineVer = VERSION;
    let result = false;
    let patterns: (RegExp|string)[];
    if (!Array.isArray(versionPatterns))
        patterns = [versionPatterns];
    else
        patterns = versionPatterns;
    for (let i = 0, len = patterns.length; i < len; ++i) {
        if (engineVer.search(patterns[i]) >= 0) {
            result = true;
            break;
        }
    }
    if (!result && throwError)
        throw new Error(`Not support cur engine version ${engineVer}`);

    return result;
}

function engineVersion(versionPatterns: (RegExp|string)[]|RegExp|string, throwError?: boolean) {
    return function (clazzOrProto: any, methodName: string, desc: PropertyDescriptor) {
        const func = desc.value as Function;
        desc.value = _createFunc(
            function () {
                if (checkEngineVersion(versionPatterns, throwError))
                    return func.call(this, ...arguments);
                else {
                    console.log(`${clazzOrProto.name}.${methodName} not support cur engine version ${VERSION}`);
                    return _noReturn(func);
                }
            },
            func
        );
    }
}

function funcProp(option: FuncPropOption) {
    return function (clazzOrProto: any, methodName: string, desc: PropertyDescriptor) {
        if (option.async)
            desc.value[kAsyncFuncKey] = true;
    }
}

export const aspects = {
    trycatch,
    runWithTryCache,
    profiler,
    runWithProfiler,
    checkEditor,
    editor,
    runtime,
    debug,
    checkDebug,
    checkEngineVersion,
    engineVersion,
    funcProp
}

function _convertProfilerTag(tag: ProfilerTag, thiz: any, ...funcArgs: any[]) {
    let _tag: string;
    if (tag instanceof Function)
        _tag = tag.call(thiz, ...funcArgs);
    else
        _tag = tag;
    return _tag;
}

function _createProfilerMsg(tag: string, startTime: number) {
    return `profiler#${tag}: ${performance.now() - startTime}ms`;
}

function _noReturn(func: Function) {
    if (func[kAsyncFuncKey])
        return Promise.resolve();
    else
        return undefined;
}

function _createFunc(target: Function, source: Function) {
    if (source[kAsyncFuncKey])
        target[kAsyncFuncKey] = source[kAsyncFuncKey];
    return target;
}