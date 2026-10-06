import * as testService from '../services/medical-test.services.js';
import { catchAsync } from '../../../utils/catchAsync.js';
import { ApiResponse } from '../../../utils/ApiResponse.js';
import { AppError } from '../../../utils/ApiError.js';

/**
 * GET /api/v1/tests
 * Saare available tests fetch karna
 */
export const getTests = catchAsync(async (req, res) => {
    const tests = await testService.getAllAvailableTests();

    if (!tests || tests.length === 0) {
        throw new AppError("No tests found in the catalog", 404);
    }

    res.status(200).json(
        new ApiResponse(200, tests, "Tests fetched successfully")
    );
});

/**
 * GET /api/v1/tests/:id
 * Ek specific test ko ID se fetch karna
 */
export const getTestById = catchAsync(async (req, res) => {
    const test = await testService.getTestById(req.params.id);

    res.status(200).json(
        new ApiResponse(200, test, "Test fetched successfully")
    );
});

/**
 * POST /api/v1/tests
 * Naya test create karna (Admin only)
 */
export const addTest = catchAsync(async (req, res) => {
    const test = await testService.createNewTest(req.body);

    res.status(201).json(
        new ApiResponse(201, test, "Test created successfully")
    );
});

/**
 * PUT /api/v1/tests/:id
 * Existing test ko update karna (Admin only)
 */
export const updateTest = catchAsync(async (req, res) => {
    const updatedTest = await testService.updateTest(req.params.id, req.body);

    res.status(200).json(
        new ApiResponse(200, updatedTest, "Test updated successfully")
    );
});

/**
 * DELETE /api/v1/tests/:id
 * Test ko soft-delete (deactivate) karna - DB se permanently delete nahi karte
 */
export const deactivateTest = catchAsync(async (req, res) => {
    const test = await testService.deactivateTest(req.params.id);

    res.status(200).json(
        new ApiResponse(200, test, "Test deactivated successfully")
    );
});