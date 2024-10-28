import { Enum } from "cc";
const _global: any = typeof window === "object" ? window :
    typeof self === "object" ? self : this;
const cc_Enum: any = Enum;
export function gameEnum(enumObj: any, name: string) {
    if (typeof _global[name] === 'undefined') {
        _global[name] = enumObj;
    }
    return Enum.apply(this, arguments);
}
gameEnum.isEnum = Enum.isEnum;
gameEnum.getList = Enum.getList;
