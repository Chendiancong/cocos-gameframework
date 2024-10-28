type DefaultValueType = Function|number|string|boolean|Object;
type StorageOption = {
    getId?: () => number|string;
    getPrefix?: () => string;
}

function storage(defaultValue: DefaultValueType)
function storage(defaultValue: DefaultValueType, option: StorageOption);
function storage(...args: any[]) {
    return function (classOrProto: any, propName: string) {
        return _storage(classOrProto, propName, args[0], args[1]??_defaultOption);
    }
}

/**
 * usage:
class TestStorageDecorate {
    @storage("item1")
    item1: string;
}
*/

export const storageUtils = {
    storage
}


const _defaultOption = {
    getId: () => "",
    getPrefix: () => "|"
}

function getKey(className, propName, option: StorageOption) {
    const id = (option.getId??_defaultOption.getId)();
    const prefix = (option.getPrefix??_defaultOption.getPrefix)();
    return `_${prefix}_${className}_${propName}_${id}`;
}

function _storage(classOrProto: any, propName: string, defaultValue: DefaultValueType, option: StorageOption) {
    const clsName = classOrProto.prototype != void 0 ?
        classOrProto.name : classOrProto.constructor.name;
    const internalName = `_${propName}`;
    const desc: PropertyDescriptor = {
        get: function () {
            let cur = this[internalName];
            if (cur == void 0) {
                const key = getKey(clsName, propName, option);
                const data = gFramework.localStorage.getItem(key);
                if (!!data)
                    cur = JSON.parse(data);
                else
                    cur = typeof defaultValue == "function" ? defaultValue() : defaultValue;
            }
            this[internalName] = cur;
            return cur;
        },
        set: function (value: any) {
            let cur = this[internalName] = value;
            const key = getKey(clsName, propName, option)
            if (cur == void 0)
                gFramework.localStorage.removeItem(key);
            else
                gFramework.localStorage.setItem(key, JSON.stringify(value));
        }
    }
    return desc as any;
}