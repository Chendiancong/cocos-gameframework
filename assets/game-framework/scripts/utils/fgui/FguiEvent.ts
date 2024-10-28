export enum FguiEvent {
    TOUCH_BEGIN = "fui_touch_begin",
    TOUCH_MOVE = "fui_touch_move",
    TOUCH_END = "fui_touch_end",
    CLICK = "fui_click",
    ROLL_OVER = "fui_roll_over",
    ROLL_OUT = "fui_roll_out",
    MOUSE_WHEEL = "fui_mouse_wheel",

    DISPLAY = "fui_display",
    UNDISPLAY = "fui_undisplay",
    GEAR_STOP = "fui_gear_stop",
    LINK = "fui_text_link",
    Submit = "editing_return",
    TEXT_CHANGE = "text_changed",

    STATUS_CHANGED = "fui_status_changed",
    XY_CHANGED = "fui_xy_changed",
    SIZE_CHANGED = "fui_size_changed",
    SIZE_DELAY_CHANGE = "fui_size_delay_change",
    COLLECTION_CHANGED = "fui_collection_changed",

    DRAG_START = "fui_drag_start",
    DRAG_MOVE = "fui_drag_move",
    DRAG_END = "fui_drag_end",
    DROP = 'fui_drop',

    SCROLL = "fui_scroll",
    SCROLL_END = "fui_scroll_end",
    PULL_DOWN_RELEASE = "fui_pull_down_release",
    PULL_UP_RELEASE = "fui_pull_up_release",

    SELECT_ITEM = 'fui_select_item',
    CLICK_ITEM = 'fui_click_item',
}