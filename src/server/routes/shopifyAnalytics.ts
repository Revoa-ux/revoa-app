import { Router } from 'express';
import { param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as analyticsController from '../controllers/shopifyAnalyticsController';

const router = Router();

router.post(
  '/orders/:orderId/profits',
  authenticate,
  [param('orderId').isUUID()],
  validate,
  analyticsController.calculateOrderProfits
);

router.post(
  '/stores/:storeId/inventory/snapshot',
  authenticate,
  [param('storeId').isUUID()],
  validate,
  analyticsController.updateInventorySnapshot
);

router.post(
  '/stores/:storeId/customers/:customerId/insights',
  authenticate,
  [
    param('storeId').isUUID(),
    param('customerId').isString()
  ],
  validate,
  analyticsController.updateCustomerInsights
);

export { router };