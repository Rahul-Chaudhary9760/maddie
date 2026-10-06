/**
 * Central Constants File
 *
 * All enums and static config values live here.
 * To add/remove a value → edit ONLY this file.
 * Nothing else needs to change.
 */

// ─── User Roles ───────────────────────────────────────────────────────────────
export const USER_ROLES = {
    USER:      'user',
    ADMIN:     'admin',
    LAB_STAFF: 'lab_staff',
};

// ─── Test Categories ──────────────────────────────────────────────────────────
export const TEST_CATEGORIES = {
    BLOOD:     'Blood',
    URINE:     'Urine',
    RADIOLOGY: 'Radiology',
    FULL_BODY: 'Full Body',
};

// ─── Booking Statuses ─────────────────────────────────────────────────────────
export const BOOKING_STATUS = {
    PENDING:   'pending',
    CONFIRMED: 'confirmed',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
};

// Statuses that lab staff / admin can set on a booking
export const UPDATABLE_BOOKING_STATUSES = [
    BOOKING_STATUS.CONFIRMED,
    BOOKING_STATUS.COMPLETED,
    BOOKING_STATUS.CANCELLED,
];

// Terminal statuses — once reached, status cannot be changed again
export const TERMINAL_BOOKING_STATUSES = [
    BOOKING_STATUS.COMPLETED,
    BOOKING_STATUS.CANCELLED,
];

// ─── Time Slots ───────────────────────────────────────────────────────────────
// Format: 'HH:MM-HH:MM' (24hr)
// To change operating hours → just edit START_HOUR / END_HOUR
const START_HOUR = 6;  // 6 AM
const END_HOUR   = 15; // 3 PM (last slot starts at 14:00)

export const TIME_SLOTS = Array.from(
    { length: END_HOUR - START_HOUR },
    (_, i) => {
        const start = String(START_HOUR + i).padStart(2, '0');
        const end   = String(START_HOUR + i + 1).padStart(2, '0');
        return `${start}:00-${end}:00`;
    }
);
// Result: ['06:00-07:00', '07:00-08:00', ..., '14:00-15:00']
