import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as subscriptionController from '../controllers/subscriptionController';

const router = Router();

router.post(
  '/subscriptions',
  authenticate,
  [
    body('tierId').isString(),
    body('shopDomain').isString()
  ],
  validate,
  subscriptionController.createSubscription
);

router.put(
  '/subscriptions/:subscriptionId',
  authenticate,
  [
    param('subscriptionId').isUUID(),
    body('tierId').isString()
  ],
  validate,
  subscriptionController.updateSubscription
);

router.post(
  '/subscriptions/:subscriptionId/cancel',
  authenticate,
  [
    param('subscriptionId').isUUID(),
    body('cancelAtPeriodEnd').isBoolean()
  ],
  validate,
  subscriptionController.cancelSubscription
);

router.get(
  '/subscriptions/:subscriptionId/usage/:period',
  authenticate,
  [
    param('subscriptionId').isUUID(),
    param('period').matches(/^\d{4}-\d{2}$/)
  ],
  validate,
  subscriptionController.getSubscriptionUsage
);

export { router };