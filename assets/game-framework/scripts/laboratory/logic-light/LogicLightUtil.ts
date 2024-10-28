import { geometry, renderer } from "cc";

function arrayRemove<T>(array: T[], target: T) {
    let i = -1, j = 0;
    const len = array.length;
    while (++i < len) {
        if (array[i] !== target)
            array[j++] = array[i];
    }
    array.length = j;
}

const getPhaseId = ((): (phaseName: string|number) => number => {
    const phases: Map<string, number> = new Map<string, number>();
    let phaseNum = 0;
    return (phaseName: string|number): number => {
        if (typeof phaseName === 'number') { return phaseName; }
        if (!phases.has(phaseName)) {
            phases.set(phaseName, 1 << phaseNum);
            phaseNum++;
        }
        return phases.get(phaseName);
    }
})();

function cullSphereLight(sceneLight: renderer.scene.SphereLight, model: renderer.scene.Model) {
    return !!(model.worldBounds && !geometry.intersect.aabbWithAABB(model.worldBounds, sceneLight.aabb));
}

function cullSpotLight(sceneLight: renderer.scene.SpotLight, model: renderer.scene.Model) {
    return !!(model.worldBounds && (!geometry.intersect.aabbWithAABB(model.worldBounds, sceneLight.aabb) || !geometry.intersect.aabbFrustum(model.worldBounds, sceneLight.frustum)))
}

export const logicLightUtil = {
    arrayRemove,
    getPhaseId,
    cullSphereLight,
    cullSpotLight
}