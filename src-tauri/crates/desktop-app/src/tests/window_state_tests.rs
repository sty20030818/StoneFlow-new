use crate::app::window_state::{
    clamp_saved_size, rect_intersects_work_area, SavedMainWindowState, WindowRect,
    MAIN_WINDOW_DEFAULT_HEIGHT, MAIN_WINDOW_DEFAULT_WIDTH, MAIN_WINDOW_MIN_HEIGHT,
    MAIN_WINDOW_MIN_WIDTH,
};

#[test]
fn clamp_saved_size_uses_defaults_as_upper_bound() {
    let size = clamp_saved_size(SavedMainWindowState {
        width: 2400.4,
        height: 1600.9,
    });

    assert_eq!(size.width, MAIN_WINDOW_DEFAULT_WIDTH);
    assert_eq!(size.height, MAIN_WINDOW_DEFAULT_HEIGHT);
}

#[test]
fn clamp_saved_size_raises_too_small_values() {
    let size = clamp_saved_size(SavedMainWindowState {
        width: 120.0,
        height: 80.0,
    });

    assert_eq!(size.width, MAIN_WINDOW_MIN_WIDTH);
    assert_eq!(size.height, MAIN_WINDOW_MIN_HEIGHT);
}

#[test]
fn monitor_intersection_accepts_visible_window() {
    let window_rect = WindowRect {
        x: 120,
        y: 80,
        width: 1000,
        height: 920,
    };
    let work_area = WindowRect {
        x: 0,
        y: 0,
        width: 1512,
        height: 945,
    };

    assert!(rect_intersects_work_area(window_rect, work_area));
}

#[test]
fn monitor_intersection_rejects_offscreen_window() {
    let window_rect = WindowRect {
        x: 2200,
        y: 1200,
        width: 1000,
        height: 920,
    };
    let work_area = WindowRect {
        x: 0,
        y: 0,
        width: 1512,
        height: 945,
    };

    assert!(!rect_intersects_work_area(window_rect, work_area));
}
