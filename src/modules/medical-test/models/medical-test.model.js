import mongoose from 'mongoose';
import { TEST_CATEGORIES } from '../../../config/constants.js';

const testSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    category: {
        type: String,
        enum: Object.values(TEST_CATEGORIES),
        default: TEST_CATEGORIES.BLOOD
    },
    isAvailable: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const Test = mongoose.model('Test', testSchema);
export default Test;