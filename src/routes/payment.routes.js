import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.js';
import { paymentLimiter } from '../middleware/rateLimiter.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

/**
 * @openapi
 * /payments:
 *   post:
 *     tags: [Payments]
 *     summary: Initiate a payment for a booking
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InitiatePaymentRequest'
 *     responses:
 *       201:
 *         description: Payment processed (check status field for SUCCESS/FAILED)
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/RateLimited'
 */
router.post('/', authenticate, paymentLimiter, asyncHandler(paymentController.initiate));

/**
 * @openapi
 * /payments/webhook:
 *   post:
 *     tags: [Payments]
 *     summary: Payment provider webhook endpoint (idempotent)
 *     description: |
 *       Receives payment status updates from the payment provider.
 *       This endpoint is idempotent - sending the same eventId multiple times
 *       is safe and will return 200 without reprocessing.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WebhookPayload'
 *     responses:
 *       200:
 *         description: Webhook processed (or already processed - idempotent)
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/RateLimited'
 */
router.post('/webhook', paymentLimiter, asyncHandler(paymentController.webhook));

export default router;
