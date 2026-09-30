import { z } from 'zod';

const createTestSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  description: z.string().max(1000).optional(),
  price: z.number().positive('Price must be a positive number').multipleOf(0.01),
});

const updateTestSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(1000).optional(),
  price: z.number().positive().multipleOf(0.01).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

const addCentreToTestSchema = z.object({
  centreId: z.string().uuid('centreId must be a valid UUID'),
});

export { createTestSchema, updateTestSchema, addCentreToTestSchema };
