import { toast } from 'sonner';

interface ApiOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = {
  async fetch<T>(url: string, options: ApiOptions = {}): Promise<T> {
    const {
      retries = 3,
      retryDelay = 1000,
      ...fetchOptions
    } = options;

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...fetchOptions,
          headers: {
            'Content-Type': 'application/json',
            ...fetchOptions.headers,
          },
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new ApiError(
            error.message || 'Request failed',
            response.status,
            error
          );
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < retries - 1) {
          await new Promise(resolve => 
            setTimeout(resolve, retryDelay * Math.pow(2, attempt))
          );
          continue;
        }
        
        break;
      }
    }

    throw lastError || new Error('Request failed');
  },

  handleError(error: unknown, fallbackMessage = 'An error occurred') {
    console.error('API Error:', error);
    
    if (error instanceof ApiError) {
      switch (error.status) {
        case 401:
          toast.error('Session expired. Please sign in again.');
          // Handle auth error (e.g., redirect to login)
          break;
        case 403:
          toast.error('You do not have permission to perform this action');
          break;
        case 404:
          toast.error('The requested resource was not found');
          break;
        case 429:
          toast.error('Too many requests. Please try again later.');
          break;
        default:
          toast.error(error.message || fallbackMessage);
      }
    } else {
      toast.error(fallbackMessage);
    }
  }
};