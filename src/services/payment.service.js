import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { canTransition } from './booking.service.js';
import logger from '../config/logger.js';

// Simulates a payment processor. 70% success rate to make testing realistic
// without requiring a real provider.
const simulatePayment = () => {
  return Math.random() < 0.7 ? 'SUCCESS' : 'FAILED';
};

const initiatePayment = async (userId, { bookingId }) => {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

  if (!booking) throw new NotFoundError('Booking not found');
  if (booking.userId !== userId) throw new ForbiddenError('Access to this booking is not allowed');

  if (booking.status !== 'PENDING') {
    throw new BadRequestError(
      `Cannot process payment for a booking with status ${booking.status}`,
      'INVALID_BOOKING_STATUS'
    );
  }

  const simulatedStatus = simulatePayment();
  const providerPaymentId = `pay_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
  const eventId = `evt_${uuidv4().replace(/-/g, '').slice(0, 16)}`;

  const newBookingStatus = simulatedStatus === 'SUCCESS' ? 'CONFIRMED' : 'FAILED';

  // Atomically create the payment record and update the booking status.
  const [payment] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        bookingId,
        provider: 'simulated',
        providerPaymentId,
        eventId,
        amount: booking.amount,
        status: simulatedStatus === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
        metadata: { simulatedAt: new Date().toISOString() },
      },
    }),
    prisma.booking.update({
      where: { id: bookingId },
      data: { status: newBookingStatus },
    }),
  ]);

  logger.info('Payment processed', {
    bookingId,
    paymentId: payment.id,
    status: payment.status,
    userId,
  });

  return payment;
};

// Idempotent webhook processor.
//
// Safety guarantees:
// 1. eventId has a DB-level UNIQUE constraint - two concurrent requests for
//    the same eventId will race to insert; the loser gets a P2002 unique
//    constraint error which we handle gracefully.
// 2. We use a DB transaction so the payment record and booking status update
//    are atomic. A crash between the two cannot leave them inconsistent.
// 3. If the eventId already exists we return 200 without re-processing.
const processWebhook = async ({ eventId, bookingId, providerPaymentId, status, amount }) => {
  // Check for duplicate event before attempting insert (fast path).
  const existingPayment = await prisma.payment.findUnique({ where: { eventId } });
  if (existingPayment) {
    logger.info('Duplicate webhook event ignored', { eventId, bookingId });
    return { alreadyProcessed: true, payment: existingPayment };
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new NotFoundError('Booking not found for this webhook event');

  // Only PENDING bookings can be acted upon by a webhook.
  // If it's already CONFIRMED or FAILED we return idempotently without error.
  if (booking.status !== 'PENDING') {
    logger.info('Webhook received for non-pending booking', {
      eventId,
      bookingId,
      currentStatus: booking.status,
    });
    return { alreadyProcessed: true, booking };
  }

  const paymentStatus = status === 'SUCCESS' ? 'SUCCESS' : 'FAILED';
  const newBookingStatus = status === 'SUCCESS' ? 'CONFIRMED' : 'FAILED';

  try {
    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          bookingId,
          provider: 'simulated',
          providerPaymentId,
          eventId,
          amount,
          status: paymentStatus,
          metadata: { webhookReceivedAt: new Date().toISOString() },
        },
      }),
      prisma.booking.update({
        where: { id: bookingId },
        data: { status: newBookingStatus },
      }),
    ]);

    logger.info('Webhook processed successfully', {
      eventId,
      bookingId,
      paymentStatus,
      newBookingStatus,
    });

    return { alreadyProcessed: false, payment };
  } catch (err) {
    // P2002 = unique constraint violation. Another concurrent request beat us
    // to this eventId. Treat it as a duplicate and return without error.
    if (err.code === 'P2002' && err.meta?.target?.includes('eventId')) {
      logger.info('Concurrent duplicate webhook handled gracefully', { eventId });
      const payment = await prisma.payment.findUnique({ where: { eventId } });
      return { alreadyProcessed: true, payment };
    }
    throw err;
  }
};

export { initiatePayment, processWebhook };
