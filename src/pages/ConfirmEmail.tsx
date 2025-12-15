import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { PageTitle } from '../components/PageTitle';
import { useAuth } from '../contexts/AuthContext';

type VerificationStatus = 'loading' | 'success' | 'error' | 'expired';

const ConfirmEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshEmailConfirmed } = useAuth();
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setErrorMessage('No verification token provided');
        return;
      }

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(`${supabaseUrl}/functions/v1/verify-signup-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          setStatus('success');
        } else if (result.error?.includes('expired')) {
          setStatus('expired');
          setErrorMessage('This verification link has expired. Please request a new one.');
        } else {
          setStatus('error');
          setErrorMessage(result.error || 'Failed to verify email');
        }
      } catch {
        setStatus('error');
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    };

    verifyToken();
  }, [searchParams]);

  const handleContinue = async () => {
    await refreshEmailConfirmed();
    navigate('/onboarding', { replace: true });
  };

  return (
    <>
      <PageTitle title="Email Confirmation" />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div
          className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:64px_64px]"
          style={{
            maskImage: 'radial-gradient(circle at center, transparent, black 30%, transparent)',
            WebkitMaskImage: 'radial-gradient(circle at center, transparent, black 30%, transparent)'
          }}
        />

        <div className="w-full max-w-[420px] space-y-8 relative">
          {status === 'loading' && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-gray-500 animate-spin" />
                </div>
              </div>
              <h2 className="text-2xl font-medium text-gray-900 dark:text-white">
                Verifying your email...
              </h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Please wait while we confirm your email address.
              </p>
            </div>
          )}

          {status === 'success' && (
            <>
              <div className="text-center">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <h2 className="text-2xl font-medium text-gray-900 dark:text-white">
                  Email confirmed!
                </h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Your account is now active. Let's get you set up.
                </p>
              </div>

              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-sm rounded-2xl p-6">
                <button
                  onClick={handleContinue}
                  className="group w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[linear-gradient(135deg,#E11D48_40%,#EC4899_80%,#E8795A_100%)] hover:scale-[1.02] transition-all duration-200"
                >
                  Get started
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </button>
              </div>
            </>
          )}

          {(status === 'error' || status === 'expired') && (
            <>
              <div className="text-center">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <h2 className="text-2xl font-medium text-gray-900 dark:text-white">
                  {status === 'expired' ? 'Link expired' : 'Verification failed'}
                </h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  {errorMessage}
                </p>
              </div>

              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-sm rounded-2xl p-6 space-y-3">
                <button
                  onClick={() => navigate('/signup')}
                  className="group w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[linear-gradient(135deg,#E11D48_40%,#EC4899_80%,#E8795A_100%)] hover:scale-[1.02] transition-all duration-200"
                >
                  Sign up again
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </button>
                <button
                  onClick={() => navigate('/auth')}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Back to sign in
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ConfirmEmail;
