import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';

describe('ErrorBoundary', () => {
  const originalConsoleError = console.error;
  
  beforeEach(() => {
    console.error = vi.fn();
  });
  
  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('renders children when there is no error', () => {
    render(
      <BrowserRouter>
        <ErrorBoundary>
          <div>Test Content</div>
        </ErrorBoundary>
      </BrowserRouter>
    );
    
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders error UI when there is an error', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    render(
      <BrowserRouter>
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      </BrowserRouter>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('calls onError prop when there is an error', () => {
    const onError = vi.fn();
    const error = new Error('Test error');
    
    const ThrowError = () => {
      throw error;
    };

    render(
      <BrowserRouter>
        <ErrorBoundary onError={onError}>
          <ThrowError />
        </ErrorBoundary>
      </BrowserRouter>
    );

    expect(onError).toHaveBeenCalled();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0][0].message).toBe('Test error');
  });

  it('resets error state when resetError is called', async () => {
    const TestComponent = ({ shouldThrow = true }) => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div>Test Content</div>;
    };

    const { rerender } = render(
      <BrowserRouter>
        <ErrorBoundary>
          <TestComponent shouldThrow={true} key="error" />
        </ErrorBoundary>
      </BrowserRouter>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Rerender with shouldThrow=false to simulate resetError being called
    rerender(
      <BrowserRouter>
        <ErrorBoundary>
          <TestComponent shouldThrow={false} key="no-error" />
        </ErrorBoundary>
      </BrowserRouter>
    );

    // Wait for the component to re-render without the error
    await waitFor(() => {
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });
});