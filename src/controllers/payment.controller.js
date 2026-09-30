import * as paymentService from '../services/payment.service.js';
import { initiatePaymentSchema, webhookSchema } from '../validators/payment.validator.js';
import { validate } from '../utils/validation.js';
import { ok, created } from '../utils/response.js';

const initiate = async (req, res) => {
  const data = validate(initiatePaymentSchema, req.body);
  const payment = await paymentService.initiatePayment(req.user.id, data);
  return created(res, payment);
};

const webhook = async (req, res) => {
  const data = validate(webhookSchema, req.body);
  const result = await paymentService.processWebhook(data);

  // Return 200 for both new and duplicate events - this is intentional.
  // Returning 4xx for duplicates would cause providers to keep retrying.
  return ok(res, result);
};

export { initiate, webhook };
