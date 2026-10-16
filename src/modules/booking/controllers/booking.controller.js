import * as bookingService from '../services/booking.services.js';
import { catchAsync } from '../../../utils/catchAsync.js';
import { ApiResponse } from '../../../utils/ApiResponse.js';

/**
 * POST /api/v1/bookings
 * Body: { testId, patientName, patientPhone?, patientAge, patientGender, address, appointmentDate, timeSlot, notes? }
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
 * Auth: Owner | Assigned Phlebotomist | Admin | Lab Staff
 */
export const getBookingById = catchAsync(async (req, res) => {
    const booking = await bookingService.getBookingById(req.params.id, req.user);

    res.status(200).json(
        new ApiResponse(200, booking, 'Booking fetched successfully')
    );
});

/**
 * GET /api/v1/bookings
 * Query params: ?status=pending&date=2025-01-15&phlebotomist=<id>&isAssigned=true/false
 * Auth: Admin | Lab Staff only
 */
export const getAllBookings = catchAsync(async (req, res) => {
    const bookings = await bookingService.getAllBookings(req.query);

    res.status(200).json(
        new ApiResponse(200, bookings, 'All bookings fetched successfully')
    );
});

/**
 * PATCH /api/v1/bookings/:id/assign-phlebotomist
 * Body: { phlebotomistId: string | null }
 * Auth: Admin | Lab Staff only
 */
export const assignPhlebotomist = catchAsync(async (req, res) => {
    const { phlebotomistId } = req.body;

    const booking = await bookingService.assignPhlebotomist(
        req.params.id,
        phlebotomistId,
        req.user
    );

    const message = phlebotomistId
        ? 'Phlebotomist assigned to booking successfully'
        : 'Phlebotomist unassigned from booking successfully';

    res.status(200).json(
        new ApiResponse(200, booking, message)
    );
});

/**
 * GET /api/v1/bookings/my-assignments
 * Query params: ?status=confirmed&date=2025-01-15
 * Auth: Phlebotomist (or Admin / Lab Staff)
 */
export const getMyAssignments = catchAsync(async (req, res) => {
    const bookings = await bookingService.getMyAssignments(req.user._id, req.query);

    res.status(200).json(
        new ApiResponse(200, bookings, 'Assigned tasks fetched successfully')
    );
});

/**
 * PATCH /api/v1/bookings/:id/sample-collected
 * Body: { collectionNotes?: string }
 * Auth: Assigned Phlebotomist | Admin | Lab Staff
 */
export const markSampleCollected = catchAsync(async (req, res) => {
    const { collectionNotes } = req.body;

    const booking = await bookingService.markSampleCollected(
        req.params.id,
        req.user,
        collectionNotes
    );

    res.status(200).json(
        new ApiResponse(200, booking, 'Sample marked as collected successfully')
    );
});

/**
 * PATCH /api/v1/bookings/:id/status
 * Body: { status: 'confirmed' | 'sample_collected' | 'completed' | 'cancelled', collectionNotes?: string }
 * Auth: Admin | Lab Staff | Assigned Phlebotomist
 */
export const updateBookingStatus = catchAsync(async (req, res) => {
    const { status, collectionNotes } = req.body;

    const booking = await bookingService.updateBookingStatus(
        req.params.id,
        status,
        req.user,
        collectionNotes
    );

    res.status(200).json(
        new ApiResponse(200, booking, `Booking status updated to '${status}'`)
    );
});

/**
 * GET /api/v1/bookings/phlebotomists
 * Auth: Admin | Lab Staff only
 * Returns directory of phlebotomists with current active workloads
 */
export const getPhlebotomistsList = catchAsync(async (req, res) => {
    const phlebotomists = await bookingService.getPhlebotomistsList();

    res.status(200).json(
        new ApiResponse(200, phlebotomists, 'Phlebotomists fetched successfully')
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
