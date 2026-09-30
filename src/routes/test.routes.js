import { Router } from 'express';
import * as testController from '../controllers/test.controller.js';
import { authenticate } from '../middleware/auth.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

/**
 * @openapi
 * /tests:
 *   get:
 *     tags: [Tests]
 *     summary: List all diagnostic tests
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *     responses:
 *       200:
 *         description: Paginated list of tests
 */
router.get('/', asyncHandler(testController.list));

/**
 * @openapi
 * /tests/{id}:
 *   get:
 *     tags: [Tests]
 *     summary: Get a test by ID
 *     parameters:
 *       - $ref: '#/components/parameters/Id'
 *     responses:
 *       200:
 *         description: Test details
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', asyncHandler(testController.get));

/**
 * @openapi
 * /tests/{id}/centres:
 *   get:
 *     tags: [Tests]
 *     summary: List centres offering a test
 *     parameters:
 *       - $ref: '#/components/parameters/Id'
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *     responses:
 *       200:
 *         description: Paginated list of centres
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id/centres', asyncHandler(testController.getCentres));

/**
 * @openapi
 * /tests:
 *   post:
 *     tags: [Tests]
 *     summary: Create a new diagnostic test
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTestRequest'
 *     responses:
 *       201:
 *         description: Test created
 */
router.post('/', authenticate, asyncHandler(testController.create));

/**
 * @openapi
 * /tests/{id}:
 *   patch:
 *     tags: [Tests]
 *     summary: Update a diagnostic test
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Id'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTestRequest'
 *     responses:
 *       200:
 *         description: Test updated
 */
router.patch('/:id', authenticate, asyncHandler(testController.update));

/**
 * @openapi
 * /tests/{id}:
 *   delete:
 *     tags: [Tests]
 *     summary: Delete a diagnostic test
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Id'
 *     responses:
 *       204:
 *         description: Test deleted
 */
router.delete('/:id', authenticate, asyncHandler(testController.remove));

/**
 * @openapi
 * /tests/{id}/centres:
 *   post:
 *     tags: [Tests]
 *     summary: Associate a test with a centre
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Id'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [centreId]
 *             properties:
 *               centreId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Association created
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.post('/:id/centres', authenticate, asyncHandler(testController.addCentre));

/**
 * @openapi
 * /tests/{id}/centres/{centreId}:
 *   delete:
 *     tags: [Tests]
 *     summary: Remove a test from a centre
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Id'
 *       - name: centreId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Association removed
 */
router.delete('/:id/centres/:centreId', authenticate, asyncHandler(testController.removeCentre));

export default router;
