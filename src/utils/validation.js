import { ValidationError } from './errors.js';

// Wraps a Zod schema parse and maps Zod errors to our ValidationError shape.
const validate = (schema, data) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    throw new ValidationError('Validation failed', details);
  }
  return result.data;
};

// Parse and clamp pagination query parameters.
const parsePagination = (query, maxLimit = 100) => {
  const page = Math.max(1, parseInt(query.page || '1', 10)) || 1;
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit || '10', 10))) || 10;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const buildPaginationMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

export { validate, parsePagination, buildPaginationMeta };
