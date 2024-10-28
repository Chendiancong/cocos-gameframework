import { PriorityTimer, IPriorityTimerHandler } from "./PriorityTimer"

export type ITimerHandler = IPriorityTimerHandler;
export interface ITimerCenter {

}
export let timerCenter = new PriorityTimer();