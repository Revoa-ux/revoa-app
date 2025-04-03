import { z } from 'zod';
import { ValidationError } from '../errors';

// Message content validation schema
export const messageContentSchema = z.object({
  content: z.string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message is too long (max 2000 characters)'),
  type: z.enum(['text', 'image', 'file', 'link']),
  sender: z.enum(['user', 'team']),
  metadata: z.record(z.unknown()).optional()
});

// Link preview validation schema
export const linkPreviewSchema = z.object({
  url: z.string().url('Invalid URL'),
  title: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional()
});

// File metadata validation schema
export const fileMetadataSchema = z.object({
  fileName: z.string(),
  fileSize: z.number(),
  fileType: z.string(),
  mimeType: z.string()
});

// Rate limiting configuration
export const RATE_LIMITS = {
  messages: {
    window: 60 * 1000, // 1 minute
    max: 30 // messages per window
  },
  uploads: {
    window: 60 * 1000, // 1 minute
    max: 5 // uploads per window
  }
};

// Message validation function
export const validateMessage = async (message: unknown): Promise<z.infer<typeof messageContentSchema>> => {
  try {
    return await messageContentSchema.parseAsync(message);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        error.errors[0].message,
        'message',
        error.errors
      );
    }
    throw error;
  }
};

// Link preview validation function
export const validateLinkPreview = async (preview: unknown): Promise<z.infer<typeof linkPreviewSchema>> => {
  try {
    return await linkPreviewSchema.parseAsync(preview);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        error.errors[0].message,
        'link_preview',
        error.errors
      );
    }
    throw error;
  }
};

// File metadata validation function
export const validateFileMetadata = async (metadata: unknown): Promise<z.infer<typeof fileMetadataSchema>> => {
  try {
    return await fileMetadataSchema.parseAsync(metadata);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        error.errors[0].message,
        'file_metadata',
        error.errors
      );
    }
    throw error;
  }
};

// Rate limiting class
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();

  check(key: string, config: { window: number; max: number }): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(timestamp => 
      now - timestamp < config.window
    );
    
    if (validAttempts.length >= config.max) {
      return false;
    }
    
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);
    return true;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

// Create rate limiter instances
export const messageLimiter = new RateLimiter();
export const uploadLimiter = new RateLimiter();