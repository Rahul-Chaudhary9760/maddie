import mongoose from 'mongoose';
import { TEST_CATEGORIES } from '../../../config/constants.js';

const detailSchema = new mongoose.Schema({
    title: { type: String, required: true },
    testsCount: { type: Number },
    icon: { type: String },
    items: { type: [String], default: [] }
}, { _id: false });

const testSchema = new mongoose.Schema({
    slug: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    originalPrice:{
        type: Number,
    },
    discountedPrice:{
        type: Number
    },
    badge:{
        type: String
    },
    price: {
        type: Number,
        required: true
    },
    testsCount:{
        type: Number
    },
    category: {
        type: String,
        enum: Object.values(TEST_CATEGORIES),
        default: TEST_CATEGORIES.BLOOD
    },
    fastingRequired:{
        type: Boolean,
        default: false
    },
    highlights:{
        type: [String],
        default: []
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    details:{
        type: [detailSchema],
        default: []
    },
    reportTime:{
        type: String,
        default: '12-15 Hours'
    }
}, { timestamps: true });

const Test = mongoose.model('Test', testSchema);
export default Test;