import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { rateLimit } from '../middleware/rateLimit';
import * as settingsController from '../controllers/settingsController';

const router = Router();

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Get all settings for the current user
router.get(
  '/settings',
  authenticate,
  limiter,
  settingsController.getSettings
);

// Get settings by category
router.get(
  '/settings/:category',
  authenticate,
  limiter,
  [param('category').isString()],
  validate,
  settingsController.getSettingsByCategory
);

// Update settings
router.put(
  '/settings/:category/:key',
  authenticate,
  limiter,
  [
    param('category').isString(),
    param('key').isString(),
    body('value').exists()
  ],
  validate,
  settingsController.updateSetting
);

// Bulk update settings
router.put(
  '/settings',
  authenticate,
  limiter,
  [
    body('settings').isArray(),
    body('settings.*.category').isString(),
    body('settings.*.key').isString(),
    body('settings.*.value').exists()
  ],
  validate,
  settingsController.bulkUpdateSettings
);

// Reset settings to default
router.post(
  '/settings/reset',
  authenticate,
  limiter,
  [body('categories').optional().isArray()],
  validate,
  settingsController.resetSettings
);

// Get settings audit log
router.get(
  '/settings/audit',
  authenticate,
  limiter,
  settingsController.getSettingsAuditLog
);

export { router };