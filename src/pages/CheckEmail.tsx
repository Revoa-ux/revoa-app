import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from '../lib/toast';
import { PageTitle } from '../components/PageTitle';
import { useAuth } from '../contexts/AuthContext';

const CheckEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user, refreshEmailConfirmed, emailConfirmed } = useAuth();
  const email = location.state?.email || '';
  const initialEmailSent = location.state?.emailSent !== false;
  const initialEmailError = location.state?.emailError || null;

  const [isResending, setIsResending] = useState(false);
  const [emailSent, setEmailSent] = useState(initialEmailSent);
  const [lastError, setLastError] = useState<string | null>(initialEmailError);
  const [isCheckingConfirmation, setIsCheckingConfirmation] = useState(false);

  useEffect(() => {
    if (initialEmailError) {
      console.warn('Email sending issue:', initialEmailError);
    }
  }, [initialEmailError]);

  const handleResendEmail = async () => {
    if (!email) {
      toast.error('Email address not found. Please sign up again.');
      return;
    }

    if (!user?.id) {
      toast.error('Session expired. Please sign up again.');
      return;
    }

    setIsResending(true);
    setLastError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/send-signup-confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: email,
        }),
      });

      const result = await response.json();
      console.log('Resend email response:', result);

      if (result.emailSent) {
        setEmailSent(true);
        toast.success('Confirmation email sent! Please check your inbox.');
      } else {
        setEmailSent(false);
        setLastError(result.message || 'Email could not be sent');
        toast.error('Failed to send email. Please try again later.');
      }
    } catch (err) {
      console.error('Failed to resend confirmation email:', err);
      setLastError('Failed to connect to email service');
      toast.error('Failed to send email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToSignIn = async () => {
    try {
      await signOut();
    } catch {
      // Ignore signout errors
    }
    navigate('/auth', { replace: true });
  };

  const handleCheckConfirmation = async () => {
    if (!user?.id) {
      toast.error('Session expired. Please sign up again.');
      return;
    }

    setIsCheckingConfirmation(true);

    try {
      // Refresh the email confirmation status from the database
      await refreshEmailConfirmed();

      // Wait a moment for state to update
      setTimeout(() => {
        if (emailConfirmed) {
          toast.success('Email confirmed! Redirecting you now...');
          // Navigate to onboarding with flag to prevent race condition redirect
          navigate('/onboarding/store', {
            replace: true,
            state: { emailJustConfirmed: true }
          });
        } else {
          toast.info('Email not confirmed yet. Please check your inbox or spam folder.');
        }
        setIsCheckingConfirmation(false);
      }, 500);
    } catch (err) {
      console.error('Failed to check confirmation status:', err);
      toast.error('Unable to check confirmation status. Please try again.');
      setIsCheckingConfirmation(false);
    }
  };

  return (
    <>
      <PageTitle title="Check Your Email" />
      <div
        className="min-h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
        style={{
          backgroundColor: 'var(--auth-bg-color, #fafafa)',
          backgroundImage: 'var(--auth-bg-pattern)',
        }}
      >
        <style>{`
          :root {
            --auth-bg-color: #fafafa;
            --auth-bg-pattern: repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 4px,
              rgba(0, 0, 0, 0.03) 4px,
              rgba(0, 0, 0, 0.03) 5px
            );
          }
          .dark {
            --auth-bg-color: #171717;
            --auth-bg-pattern: repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 4px,
              rgba(255, 255, 255, 0.06) 4px,
              rgba(255, 255, 255, 0.06) 5px
            );
          }
        `}</style>

        <div className="w-full max-w-[420px] space-y-6 relative">
          <div className="bg-white/70 dark:bg-dark/70 backdrop-blur-sm shadow-sm rounded-2xl p-8">
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 relative">
                  <img
                    src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Revoa%20Transparent%20Icon.png"
                    alt="Logo"
                    className="w-full h-full object-contain dark:invert dark:brightness-0 dark:contrast-200"
                  />
                </div>
              </div>

              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Check your email</h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {emailSent
                    ? <>We sent a confirmation link to <span className="text-[#E11D48] font-medium">{email || 'your email'}</span></>
                    : 'Your account was created successfully'}
                </p>
              </div>

              {!emailSent && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <p className="text-sm text-amber-800 dark:text-amber-200 text-center">
                    We couldn't send the confirmation email. Please click the button below to try again.
                  </p>
                  {lastError && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 text-center mt-2">
                      {lastError}
                    </p>
                  )}
                </div>
              )}

              {emailSent && (
                <div className="bg-gray-100 dark:bg-[#3a3a3a]/50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    Click the link in the email to confirm your account. If you do not see the email, check your spam folder.
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200 dark:border-[#3a3a3a] space-y-3">
                <button
                  onClick={handleResendEmail}
                  disabled={isResending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 dark:border-[#4a4a4a] rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
                  {emailSent ? 'Resend confirmation email' : 'Send confirmation email'}
                </button>

                <button
                  onClick={handleCheckConfirmation}
                  disabled={isCheckingConfirmation}
                  className="w-full text-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
                >
                  {isCheckingConfirmation ? 'Checking...' : 'Already confirmed on another device?'}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleBackToSignIn}
            className="group w-full flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
            Back to sign in
          </button>
        </div>
      </div>
    </>
  );
};

export default CheckEmail;
