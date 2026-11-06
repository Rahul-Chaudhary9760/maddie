import Test from '../models/medical-test.model.js';
import { AppError } from '../../../utils/ApiError.js';
import logger from '../../../utils/logger.js';

/**
 * Fetch paginated available medical tests catalog
 */
export const getAllAvailableTests = async (queryParams = {}) => {
    logger.debug('Fetching available medical tests catalog with pagination');

    const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const filter = {};

    if (queryParams.isAvailable !== undefined) {
        filter.isAvailable = queryParams.isAvailable === 'true' || queryParams.isAvailable === true;
    } else {
        filter.isAvailable = true;
    }

    if (queryParams.category) {
        filter.category = new RegExp(`^${queryParams.category.trim()}$`, 'i');
    }

    if (queryParams.search) {
        const trimmed = queryParams.search.trim();
        const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(escaped, 'i');
        const orConditions = [
            { name: searchRegex },
            { description: searchRegex }
        ];
        if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
            orConditions.push({ _id: trimmed });
        }
        filter.$or = orConditions;
    }

    const [total, tests] = await Promise.all([
        Test.countDocuments(filter),
        Test.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean()
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
        tests,
        pagination: {
            total,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    };
};

/**
 * Fetch a single test by its ID
 */
export const getTestById = async (testId) => {
    logger.debug(`Fetching test details for ID: ${testId}`);
    const test = await Test.findById(testId);
    
    // Agar id galat hai ya test exist nahi karta toh yahi se error fek denge
    // Controller ise catchAsync ke through pakad ke global error handler ko bhej dega
    if (!test) {
        logger.warn(`Test not found: ID=${testId}`);
        throw new AppError("Test not found", 404);
    }
    
    return test;
};

/**
 * Create a new test (Admin Panel use case)
 */
export const createNewTest = async (testData) => {
    logger.info(`Creating medical test: '${testData.name}' [Category: ${testData.category}, Price: ₹${testData.price}]`);

    // Check if test with same name already exists
    const existingTest = await Test.findOne({ name: testData.name });
    if (existingTest) {
        logger.warn(`Test creation failed: Duplicate name '${testData.name}'`);
        throw new AppError(`Test named '${testData.name}' already exists in the catalog`, 400);
    }

    const newTest = await Test.create(testData);
    logger.info(`✅ Test created successfully: '${newTest.name}' [ID: ${newTest._id}]`);
    return newTest;
};

/**
 * Update test details like price, description etc.
 */
export const updateTest = async (testId, updateData) => {
    logger.info(`Updating test: ID=${testId}`);
    const updatedTest = await Test.findByIdAndUpdate(
        testId,
        updateData,
        { 
            new: true, // Returns the updated document instead of the old one
            runValidators: true // Ensures Mongoose schema validations run on updates
        }
    );

    if (!updatedTest) {
        logger.warn(`Update failed: Test ${testId} not found`);
        throw new AppError("Test not found or could not be updated", 404);
    }

    logger.info(`✅ Test updated successfully: '${updatedTest.name}' [ID: ${testId}]`);
    return updatedTest;
};

/**
 * Soft delete a test (Deactivate)
 * Hum actually DB se delete nahi karte warna purani bookings crash ho jayengi
 */
export const deactivateTest = async (testId) => {
    logger.info(`Deactivating test: ID=${testId}`);
    const test = await Test.findByIdAndUpdate(
        testId,
        { isAvailable: false },
        { new: true }
    );

    if (!test) {
        logger.warn(`Deactivation failed: Test ${testId} not found`);
        throw new AppError("Test not found", 404);
    }

    logger.info(`✅ Test deactivated successfully: '${test.name}' [ID: ${testId}]`);
    return test;
};