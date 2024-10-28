const kVec4ElementNum = 4;
const kF32ByteNum = Float32Array.BYTES_PER_ELEMENT;

export const kUBOAdditiveLightBinding = 1;

export const kMaxAdditiveLight = 4;

export const kLightPosOffset = 0;
export const kLightPosElementCount = kVec4ElementNum;
export const kLightColorOffset = kLightPosOffset + kMaxAdditiveLight*kLightPosElementCount;
export const kLightColorElementCount = kVec4ElementNum;
export const kLightSizeRangeAngleOffset = kLightColorOffset + kMaxAdditiveLight*kLightColorElementCount;
export const kLightSizeRangeAngleElementCount = kVec4ElementNum;
export const kLightDirOffset = kLightSizeRangeAngleOffset + kMaxAdditiveLight*kLightSizeRangeAngleElementCount;
export const kLightDirElementCount = kVec4ElementNum;

export const kLightNumOffset = kLightDirOffset + kMaxAdditiveLight*kLightDirElementCount;
export const kLightNumElementCount = 1;
export const kLightIntCount = kLightNumElementCount;

export const kLightF32Count = kLightNumOffset;

export const kLightBufferSize = kLightF32Count*kF32ByteNum + kLightIntCount*kF32ByteNum; // total byte count
export const kRealityLightNumKey = 'realityLightNum';
export const kLightDatasKey = 'lightDatas';

export const enum LightType {
    Directional = 0,
    Sphere = 1,
    Spot = 2,
    Unknown = 3,
}