import { z } from 'zod';
import { ValidationError } from '../errors';

// Common validation schemas
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .max(255, 'Email is too long');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be less than 72 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[\w\W]*$/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  )
  .refine(
    (password) => /[A-Z]/.test(password),
    'Password must contain at least one uppercase letter'
  )
  .refine(
    (password) => /[a-z]/.test(password),
    'Password must contain at least one lowercase letter'
  )
  .refine(
    (password) => /\d/.test(password),
    'Password must contain at least one number'
  );

// Auth schemas
export const authSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

export const resetPasswordSchema = z.object({
  email: emailSchema
});

export const updatePasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// Signup form validation schema
export const signupFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// Profile schema
export const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: emailSchema,
  metadata: z.record(z.unknown()).optional()
});

export const validateRequest = async <T>(
  schema: z.Schema<T>,
  data: unknown
): Promise<T> => {
  try {
    return await schema.parseAsync(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        error.errors[0].message,
        error.errors[0].path.join('.'),
        error.errors
      );
    }
    throw error;
  }
};

// Form validation helper with detailed error handling
export const validateForm = async <T>(
  schema: z.Schema<T>,
  data: unknown
): Promise<{ success: boolean; data?: T; error?: string }> => {
  try {
    const validData = await schema.parseAsync(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Get the first validation error
      const firstError = error.errors[0];
      return {
        success: false,
        error: firstError.message
      };
    }
    return {
      success: false,
      error: 'Validation failed'
    };
  }
};