import * as bookingService from '../services/booking.service.js';
import { createBookingSchema } from '../validators/booking.validator.js';
import { validate } from '../utils/validation.js';
import { ok, created, paginated } from '../utils/response.js';

const create = async (req, res) => {
  const data = validate(createBookingSchema, req.body);
  const booking = await bookingService.createBooking(req.user.id, data);
  return created(res, booking);
};

const get = async (req, res) => {
  const booking = await bookingService.getBooking(req.params.id, req.user.id);
  return ok(res, booking);
};

const list = async (req, res) => {
  const { bookings, meta } = await bookingService.listBookings(req.user.id, req.query);
  return paginated(res, bookings, meta);
};

const cancel = async (req, res) => {
  const booking = await bookingService.cancelBooking(req.params.id, req.user.id);
  return ok(res, booking);
};

export { create, get, list, cancel };
