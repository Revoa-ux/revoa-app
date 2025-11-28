import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const emailSchema = z
  .string()
  .email('Invalid email address')
  .min(1, 'Email is required');

export const profileSetupSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(50, 'First name is too long'),
  last_name: z.string().min(1, 'Last name is required').max(50, 'Last name is too long'),
  display_name: z.string().min(1, 'Display name is required').max(100, 'Display name is too long'),
  phone: z.string().optional(),
  bio: z.string().max(500, 'Bio is too long').optional(),
  timezone: z.string().optional(),
});

export const profileUpdateSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(50, 'First name is too long').optional(),
  last_name: z.string().min(1, 'Last name is required').max(50, 'Last name is too long').optional(),
  display_name: z.string().min(1, 'Display name is required').max(100, 'Display name is too long').optional(),
  phone: z.string().optional(),
  bio: z.string().max(500, 'Bio is too long').optional(),
  timezone: z.string().optional(),
  notification_preferences: z.object({
    email: z.boolean(),
    push: z.boolean(),
    chat: z.boolean(),
  }).optional(),
});

export const passwordChangeSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: passwordSchema,
  confirm_password: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

export const emailChangeSchema = z.object({
  new_email: emailSchema,
  password: z.string().min(1, 'Password is required for email change'),
});

export const profilePictureSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, 'File size must be less than 5MB')
    .refine(
      (file) => ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(file.type),
      'File must be a valid image (JPEG, PNG, WebP, or GIF)'
    ),
});

export type ProfileSetupData = z.infer<typeof profileSetupSchema>;
export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;
export type PasswordChangeData = z.infer<typeof passwordChangeSchema>;
export type EmailChangeData = z.infer<typeof emailChangeSchema>;
export type ProfilePictureData = z.infer<typeof profilePictureSchema>;

export function validateProfileSetup(data: unknown): { success: true; data: ProfileSetupData } | { success: false; errors: Record<string, string> } {
  const result = profileSetupSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  result.error.issues.forEach((issue) => {
    const path = issue.path.join('.');
    errors[path] = issue.message;
  });

  return { success: false, errors };
}

export function validatePasswordChange(data: unknown): { success: true; data: PasswordChangeData } | { success: false; errors: Record<string, string> } {
  const result = passwordChangeSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  result.error.issues.forEach((issue) => {
    const path = issue.path.join('.');
    errors[path] = issue.message;
  });

  return { success: false, errors };
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/<[^>]*>/g, '');
}

export function validateTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export const commonTimezones = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona' },
  { value: 'America/Anchorage', label: 'Alaska' },
  { value: 'Pacific/Honolulu', label: 'Hawaii' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Shanghai', label: 'China Standard Time - Beijing/Shanghai' },
  { value: 'Asia/Chongqing', label: 'China - Chongqing' },
  { value: 'Asia/Harbin', label: 'China - Harbin' },
  { value: 'Asia/Urumqi', label: 'China - Urumqi/Xinjiang' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
  { value: 'Asia/Macau', label: 'Macau (CST)' },
  { value: 'Asia/Taipei', label: 'Taiwan - Taipei (CST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Seoul', label: 'Seoul (KST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Bangkok', label: 'Bangkok (ICT)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'India - Kolkata (IST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
];
