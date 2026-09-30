// Standard success response shape used across all controllers.
const ok = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({ success: true, data });
};

const created = (res, data) => ok(res, data, 201);

const paginated = (res, data, meta) => {
  return res.status(200).json({ success: true, data, meta });
};

export { ok, created, paginated };
