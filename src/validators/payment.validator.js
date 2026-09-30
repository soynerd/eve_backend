import { z } from 'zod';

const initiatePaymentSchema = z.object({
  bookingId: z.string().uuid('bookingId must be a valid UUID'),
});

// Webhook payload from the simulated payment provider.
// eventId enforces idempotency at the application layer (DB unique constraint
// provides the final guarantee against races).
const webhookSchema = z.object({
  eventId: z.string().min(1, 'eventId is required'),
  bookingId: z.string().uuid('bookingId must be a valid UUID'),
  providerPaymentId: z.string().min(1, 'providerPaymentId is required'),
  status: z.enum(['SUCCESS', 'FAILED'], {
    errorMap: () => ({ message: 'status must be SUCCESS or FAILED' }),
  }),
  amount: z.number().positive('amount must be positive'),
});

export { initiatePaymentSchema, webhookSchema };
