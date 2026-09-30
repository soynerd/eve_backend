import prisma from '../config/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { parsePagination, buildPaginationMeta } from '../utils/validation.js';

// Allowed booking state transitions. Only transitions in this map are valid.
// Reasoning:
//   PENDING -> CONFIRMED : successful payment
//   PENDING -> FAILED    : payment failed
//   PENDING -> CANCELLED : user cancels before payment
//   FAILED  -> CANCELLED : user cleans up a failed booking
// All other transitions (e.g. CONFIRMED -> CANCELLED) are intentionally blocked.
const ALLOWED_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'FAILED', 'CANCELLED'],
  FAILED: ['CANCELLED'],
  CONFIRMED: [],
  CANCELLED: [],
};

const canTransition = (from, to) => ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;

const formatBooking = (booking) => ({
  id: booking.id,
  userId: booking.userId,
  testId: booking.testId,
  centreId: booking.centreId,
  appointmentDate: booking.appointmentDate,
  amount: booking.amount,
  status: booking.status,
  createdAt: booking.createdAt,
  updatedAt: booking.updatedAt,
  test: booking.test,
  centre: booking.centre,
  user: booking.user
    ? { id: booking.user.id, name: booking.user.name, email: booking.user.email }
    : undefined,
});

const createBooking = async (userId, { testId, centreId, appointmentDate }) => {
  // Verify the test is offered at the requested centre
  const centreTest = await prisma.centreTest.findUnique({
    where: { centreId_testId: { centreId, testId } },
    include: { test: true, centre: true },
  });

  if (!centreTest) {
    // Provide a more helpful message distinguishing "test doesn't exist" from
    // "test not offered at this centre"
    const testExists = await prisma.diagnosticTest.findUnique({ where: { id: testId } });
    if (!testExists) throw new NotFoundError('Diagnostic test not found');

    const centreExists = await prisma.diagnosticCentre.findUnique({ where: { id: centreId } });
    if (!centreExists) throw new NotFoundError('Diagnostic centre not found');

    throw new BadRequestError(
      'This test is not offered at the selected centre',
      'TEST_NOT_AT_CENTRE'
    );
  }

  // Amount captured at booking time from the test's current price.
  // Future price changes will not affect this booking.
  const booking = await prisma.booking.create({
    data: {
      userId,
      testId,
      centreId,
      appointmentDate: new Date(appointmentDate),
      amount: centreTest.test.price,
      status: 'PENDING',
    },
    include: { test: true, centre: true },
  });

  return formatBooking(booking);
};

const getBooking = async (bookingId, userId) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { test: true, centre: true },
  });

  if (!booking) throw new NotFoundError('Booking not found');
  if (booking.userId !== userId) throw new ForbiddenError('Access to this booking is not allowed');

  return formatBooking(booking);
};

const listBookings = async (userId, query) => {
  const { page, limit, skip } = parsePagination(query);

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where: { userId },
      include: { test: true, centre: true },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.booking.count({ where: { userId } }),
  ]);

  return {
    bookings: bookings.map(formatBooking),
    meta: buildPaginationMeta(page, limit, total),
  };
};

const cancelBooking = async (bookingId, userId) => {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

  if (!booking) throw new NotFoundError('Booking not found');
  if (booking.userId !== userId) throw new ForbiddenError('Access to this booking is not allowed');

  if (!canTransition(booking.status, 'CANCELLED')) {
    throw new BadRequestError(
      `Cannot cancel a booking with status ${booking.status}`,
      'INVALID_STATE_TRANSITION'
    );
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'CANCELLED' },
    include: { test: true, centre: true },
  });

  return formatBooking(updated);
};

export {
  createBooking,
  getBooking,
  listBookings,
  cancelBooking,
  canTransition,
};
