import * as bookingService from '../services/booking.services.js';
import { catchAsync } from '../../../utils/catchAsync.js';
import { ApiResponse } from '../../../utils/ApiResponse.js';
import { UPDATABLE_BOOKING_STATUSES } from '../../../config/constants.js';

/**
 * POST /api/v1/bookings
 * Body: { testId, patientName, patientAge, patientGender, appointmentDate, timeSlot, notes? }
 * Auth: Any logged-in user
 */
export const createBooking = catchAsync(async (req, res) => {
    const booking = await bookingService.createBooking(req.user._id, req.body);

    res.status(201).json(
        new ApiResponse(201, booking, 'Booking created successfully')
    );
});

/**
 * GET /api/v1/bookings/my
 * Auth: Any logged-in user — returns only their own bookings
 */
export const getMyBookings = catchAsync(async (req, res) => {
    const bookings = await bookingService.getMyBookings(req.user._id);

    res.status(200).json(
        new ApiResponse(200, bookings, 'Your bookings fetched successfully')
    );
});

/**
 * GET /api/v1/bookings/:id
 * Auth: Owner | Admin | Lab Staff
 */
export const getBookingById = catchAsync(async (req, res) => {
    const booking = await bookingService.getBookingById(req.params.id, req.user);

    res.status(200).json(
        new ApiResponse(200, booking, 'Booking fetched successfully')
    );
});

/**
 * GET /api/v1/bookings
 * Query params: ?status=pending&date=2025-01-15
 * Auth: Admin | Lab Staff only
 */
export const getAllBookings = catchAsync(async (req, res) => {
    const bookings = await bookingService.getAllBookings(req.query);

    res.status(200).json(
        new ApiResponse(200, bookings, 'All bookings fetched successfully')
    );
});

/**
 * PATCH /api/v1/bookings/:id/status
 * Body: { status: 'confirmed' | 'completed' | 'cancelled' }
 * Auth: Admin | Lab Staff only
 */
export const updateBookingStatus = catchAsync(async (req, res) => {
    const { status } = req.body;

    if (!UPDATABLE_BOOKING_STATUSES.includes(status)) {
        return res.status(400).json(
            new ApiResponse(400, null, `Invalid status. Allowed values: ${UPDATABLE_BOOKING_STATUSES.join(', ')}`)
        );
    }

    const booking = await bookingService.updateBookingStatus(
        req.params.id,
        status,
        req.user._id
    );

    res.status(200).json(
        new ApiResponse(200, booking, `Booking status updated to '${status}'`)
    );
});

/**
 * PATCH /api/v1/bookings/:id/cancel
 * Auth: Logged-in user — can only cancel their own pending bookings
 */
export const cancelMyBooking = catchAsync(async (req, res) => {
    const booking = await bookingService.cancelMyBooking(req.params.id, req.user._id);

    res.status(200).json(
        new ApiResponse(200, booking, 'Booking cancelled successfully')
    );
});
