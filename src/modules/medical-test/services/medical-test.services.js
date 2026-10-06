import Test from '../models/medical-test.model.js';
import { AppError } from '../../../utils/ApiError.js';
import logger from '../../../utils/logger.js';

/**
 * Fetch all available medical tests
 * (Future me isme pagination aur search filters add kar sakte hain)
 */
export const getAllAvailableTests = async (query = {}) => {
    logger.debug('Fetching all available medical tests catalog');
    const tests = await Test.find({ isAvailable: true, ...query }).sort({ createdAt: -1 });
    return tests;
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