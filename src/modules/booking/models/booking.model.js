import mongoose from 'mongoose';
import { BOOKING_STATUS, TIME_SLOTS } from '../../../config/constants.js';

const addressSchema = new mongoose.Schema(
    {
        street: {
            type: String,
            required: [true, 'Street address is required'],
            trim: true
        },
        city: {
            type: String,
            required: [true, 'City is required'],
            trim: true
        },
        state: {
            type: String,
            trim: true,
            default: ''
        },
        pincode: {
            type: String,
            required: [true, 'Pincode is required'],
            trim: true
        },
        landmark: {
            type: String,
            trim: true,
            default: ''
        }
    },
    { _id: false }
);

const bookingSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        test: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Test',
            required: true
        },
        // Patient info — may differ from the logged-in user (booking for family)
        patientName: {
            type: String,
            required: [true, 'Patient name is required'],
            trim: true
        },
        patientAge: {
            type: Number,
            required: [true, 'Patient age is required'],
            min: [1, 'Age must be at least 1'],
            max: [120, 'Age must be realistic']
        },
        patientGender: {
            type: String,
            enum: ['male', 'female', 'other'],
            required: [true, 'Patient gender is required']
        },
        address: {
            type: addressSchema,
            required: [true, 'Address details are required']
        },
        appointmentDate: {
            type: Date,
            required: [true, 'Appointment date is required']
        },
        timeSlot: {
            type: String,
            enum: TIME_SLOTS,
            required: [true, 'Time slot is required']
        },
        // Snapshot of price at booking time (in case test price changes later)
        totalAmount: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            enum: Object.values(BOOKING_STATUS),
            default: BOOKING_STATUS.PENDING
        },
        notes: {
            type: String,
            trim: true,
            default: ''
        },
        // Lab staff who last updated the status
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }
    },
    { timestamps: true }
);

// Index for common queries — user's bookings sorted by date
bookingSchema.index({ user: 1, appointmentDate: -1 });
// Index for admin/lab staff to filter by status
bookingSchema.index({ status: 1, appointmentDate: 1 });

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
