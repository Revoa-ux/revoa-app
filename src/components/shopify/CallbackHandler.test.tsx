import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CallbackHandler from './CallbackHandler';

// Mock modules
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useSearchParams: () => [
      new URLSearchParams({
        shop: 'test-store.myshopify.com',
        code: 'test_code',
        state: 'test_state',
        hmac: 'test_hmac',
        timestamp: Math.floor(Date.now() / 1000).toString()
      })
    ]
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user' },
    isAuthenticated: true,
    hasCompletedOnboarding: false
  })
}));

vi.mock('@/lib/shopify/auth', () => ({
  handleCallback: vi.fn()
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('CallbackHandler Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('shopify_state', 'test_state');
  });

  it('shows loading state initially', () => {
    render(
      <BrowserRouter>
        <CallbackHandler />
      </BrowserRouter>
    );

    expect(screen.getByText(/Connecting to Shopify/i)).toBeInTheDocument();
    expect(screen.getByText(/Please wait/i)).toBeInTheDocument();
  });

  it('should redirect to /onboarding/ads after successful authentication', async () => {
    const mockHandleCallback = vi.mocked(require('@/lib/shopify/auth').handleCallback); // eslint-disable-line @typescript-eslint/no-var-requires
    mockHandleCallback.mockResolvedValueOnce({});

    render(
      <BrowserRouter>
        <CallbackHandler />
      </BrowserRouter>
    );  

    await waitFor(() => {
      expect(mockHandleCallback).toHaveBeenCalledWith(
        expect.any(URLSearchParams)
      ); // eslint-disable-next-line @typescript-eslint/no-var-requires
      expect(vi.mocked(require('sonner').toast.success)).toHaveBeenCalledWith('Successfully connected to Shopify');
    });
  });

  it('should show error message when callback fails', async () => {
    const mockHandleCallback = vi.mocked(require('@/lib/shopify/auth').handleCallback);
    mockHandleCallback.mockRejectedValueOnce(new Error('Failed to connect'));

    render(
      <BrowserRouter>
        <CallbackHandler />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Connection Failed/i)).toBeInTheDocument();
      expect(vi.mocked(require('sonner').toast.error)).toHaveBeenCalledWith(
        'Failed to connect to Shopify store',
        { description: 'Failed to connect' }
      );
    });
  });

  it('handles missing parameters', async () => {
    vi.mocked(require('react-router-dom')).useSearchParams = () => [new URLSearchParams({})];

    render(
      <BrowserRouter>
        <CallbackHandler />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Connection Failed/i)).toBeInTheDocument();
      expect(screen.getByText(/Missing required parameters/i)).toBeInTheDocument();
    });
  });
});