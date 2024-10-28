import { QueueTask, SeqQueue, IQueue } from "./seq-queue";

export let timeout = 3000;

/**
 * Add tasks into task group. Create the task group if it dose not exist.
 */
export function addTask(
    key: number|string,
    fn: (task: QueueTask) => void,
    ontimeout?: () => void,
    timeoutMs?: number
) {
    return SeqQueue
        .getOrCreateQueue(key, timeout)
        .push(fn, ontimeout, timeoutMs);
}

/**
 * Destroy task group
 */
export function closeTask(key: number|string, force: boolean) {
    SeqQueue.getQueue(key)?.close(force);
    SeqQueue.removeQueue(key);
}