interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  timeout?: number;
  shouldRetry?: (error: Error) => boolean;
}

export const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    timeout = 20000,
    shouldRetry = (error: Error) => {
      return error.message.includes('timeout') || 
             error.message.includes('network') ||
             error.status === 504;
    }
  } = options;

  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Operation timed out')), timeout);
      });

      // Race between the operation and timeout
      return await Promise.race([operation(), timeoutPromise]) as T;
    } catch (error) {
      lastError = error as Error;
      
      // Check if we should retry this error
      if (!shouldRetry(lastError)) {
        throw lastError;
      }

      attempt++;
      
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        initialDelay * Math.pow(backoffFactor, attempt) * (0.9 + Math.random() * 0.2),
        maxDelay
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Operation failed after retries');
};