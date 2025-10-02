import { AuthError, NetworkError, ValidationError, isAppError } from './errors';
import { supabase } from './supabase';

interface ErrorReport {
  timestamp: string;
  email: string;
  errorMessage: string;
  errorCode?: string;
  consoleErrors: string[];
  browserInfo: {
    userAgent: string;
    language: string;
    platform: string;
  };
  deviceInfo: {
    screenSize: string;
    colorDepth: number;
    pixelRatio: number;
  };
  networkInfo: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
  retryAttempt: number;
  metadata?: Record<string, any>;
}

export const reportError = async (error: unknown, email?: string): Promise<void> => {
  try {
    const report: ErrorReport = {
      timestamp: new Date().toISOString(),
      email: email || 'anonymous',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorCode: isAppError(error) ? error.code : undefined,
      consoleErrors: [],
      browserInfo: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform
      },
      deviceInfo: {
        screenSize: `${window.screen.width}x${window.screen.height}`,
        colorDepth: window.screen.colorDepth,
        pixelRatio: window.devicePixelRatio
      },
      networkInfo: {},  
      retryAttempt: 0,
      metadata: isAppError(error) ? error.details : undefined
    };

    // Add network information if available
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      if (conn) {
        report.networkInfo = {
          effectiveType: conn.effectiveType,
          downlink: conn.downlink,
          rtt: conn.rtt
        };
      }
    }

    // Store error report in Supabase
    const { error: reportError } = await supabase
      .from('error_reports')
      .insert([report]);

    if (reportError) {
      console.error('Failed to store error report:', reportError);
    }
  } catch (reportError) {
    console.error('Failed to report error:', reportError);
  }
};

export const handleError = async (error: unknown, email?: string): Promise<void> => {
  // Report error
  await reportError(error, email);

  // Log error details
  if (error instanceof AuthError) {
    console.error('Auth error:', {
      message: error.message,
      code: error.code,
      status: error.status,
      details: error.details
    });
  } else if (error instanceof NetworkError) {
    console.error('Network error:', {
      message: error.message,
      code: error.code,
      status: error.status,
      details: error.details
    });
  } else if (error instanceof ValidationError) {
    console.error('Validation error:', {
      message: error.message,
      field: error.field,
      details: error.details
    });
  } else if (error instanceof Error) {
    console.error('Unexpected error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
  } else {
    console.error('Unknown error:', error);
  }
};