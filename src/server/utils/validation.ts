import { z } from 'zod';

// Schema definitions for different setting types
const notificationSchema = z.object({
  enabled: z.boolean(),
  types: z.array(z.string()).optional()
});

const privacySchema = z.object({
  analytics: z.boolean(),
  marketing: z.boolean()
});

const displaySchema = z.object({
  mode: z.enum(['light', 'dark', 'system']),
  textSize: z.enum(['small', 'medium', 'large']).optional()
});

const languageSchema = z.object({
  code: z.string().min(2).max(5),
  region: z.string().min(2).max(5).optional()
});

// Validation schemas by category and key
const validationSchemas: Record<string, Record<string, z.ZodType<any>>> = {
  notifications: {
    email: notificationSchema,
    push: notificationSchema,
    in_app: notificationSchema
  },
  privacy: {
    data_sharing: privacySchema,
    visibility: z.object({
      profile: z.enum(['public', 'private']),
      activity: z.enum(['public', 'private'])
    })
  },
  display: {
    theme: displaySchema,
    language: languageSchema
  }
};

export const validateSettingValue = (
  category: string,
  key: string,
  value: any
): string | null => {
  try {
    const schema = validationSchemas[category]?.[key];
    if (!schema) {
      return 'Invalid setting category or key';
    }

    schema.parse(value);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors[0].message;
    }
    return 'Invalid setting value';
  }
};