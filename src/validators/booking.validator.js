import { z } from 'zod';

const createBookingSchema = z.object({
  testId: z.string().uuid('testId must be a valid UUID'),
  centreId: z.string().uuid('centreId must be a valid UUID'),
  appointmentDate: z
    .string()
    .datetime({ message: 'appointmentDate must be an ISO 8601 datetime string' })
    .refine((val) => new Date(val) > new Date(), {
      message: 'appointmentDate must be in the future',
    }),
});

export { createBookingSchema };
