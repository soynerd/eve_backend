import { Router } from 'express';
import * as centreController from '../controllers/centre.controller.js';
import { authenticate } from '../middleware/auth.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

/**
 * @openapi
 * /centres:
 *   get:
 *     tags: [Centres]
 *     summary: List all diagnostic centres
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *     responses:
 *       200:
 *         description: Paginated list of centres
 */
router.get('/', asyncHandler(centreController.list));

/**
 * @openapi
 * /centres/{id}:
 *   get:
 *     tags: [Centres]
 *     summary: Get a centre by ID
 *     parameters:
 *       - $ref: '#/components/parameters/Id'
 *     responses:
 *       200:
 *         description: Centre details
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', asyncHandler(centreController.get));

/**
 * @openapi
 * /centres/{id}/tests:
 *   get:
 *     tags: [Centres]
 *     summary: List tests offered by a centre
 *     parameters:
 *       - $ref: '#/components/parameters/Id'
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *     responses:
 *       200:
 *         description: Paginated list of tests
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id/tests', asyncHandler(centreController.getTests));

/**
 * @openapi
 * /centres:
 *   post:
 *     tags: [Centres]
 *     summary: Create a new diagnostic centre
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCentreRequest'
 *     responses:
 *       201:
 *         description: Centre created
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/', authenticate, asyncHandler(centreController.create));

/**
 * @openapi
 * /centres/{id}:
 *   patch:
 *     tags: [Centres]
 *     summary: Update a centre
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Id'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCentreRequest'
 *     responses:
 *       200:
 *         description: Centre updated
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:id', authenticate, asyncHandler(centreController.update));

/**
 * @openapi
 * /centres/{id}:
 *   delete:
 *     tags: [Centres]
 *     summary: Delete a centre
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Id'
 *     responses:
 *       204:
 *         description: Centre deleted
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:id', authenticate, asyncHandler(centreController.remove));

export default router;
