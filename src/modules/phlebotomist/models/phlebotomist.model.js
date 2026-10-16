import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { USER_ROLES } from '../../../config/constants.js';

const phlebotomistSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Phlebotomist name is required'],
            trim: true
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
        },
        phone: {
            type: String,
            required: [true, 'Phone number is required'],
            unique: true,
            trim: true
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false
        },
        role: {
            type: String,
            default: USER_ROLES.PHLEBOTOMIST
        },
        isActive: {
            type: Boolean,
            default: true
        },
        servicePincodes: {
            type: [String],
            default: []
        },
        vehicleType: {
            type: String,
            trim: true,
            default: 'Bike'
        },
        refreshToken: {
            type: String,
            select: false
        }
    },
    { timestamps: true }
);

// Hash password before saving to DB
phlebotomistSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12);
});

// Compare password method
phlebotomistSchema.methods.isPasswordCorrect = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const Phlebotomist = mongoose.model('Phlebotomist', phlebotomistSchema);
export default Phlebotomist;
