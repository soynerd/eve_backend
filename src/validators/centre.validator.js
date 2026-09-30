import { z } from 'zod';

const createCentreSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  location: z.string().min(2, 'Location must be at least 2 characters').max(500),
});

const updateCentreSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  location: z.string().min(2).max(500).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export { createCentreSchema, updateCentreSchema };
