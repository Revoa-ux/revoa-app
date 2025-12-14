import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { PageTitle } from '../components/PageTitle';
import { useAuth } from '../contexts/AuthContext';

const CheckEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const email = location.state?.email || '';
  const initialEmailSent = location.state?.emailSent !== false;
  const initialEmailError = location.state?.emailError || null;

  const [isResending, setIsResending] = useState(false);
  const [emailSent, setEmailSent] = useState(initialEmailSent);
  const [lastError, setLastError] = useState<string | null>(initialEmailError);

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

  return (
    <>
      <PageTitle title="Check Your Email" />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div
          className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:64px_64px]"
          style={{
            maskImage: 'radial-gradient(circle at center, transparent, black 30%, transparent)',
            WebkitMaskImage: 'radial-gradient(circle at center, transparent, black 30%, transparent)'
          }}
        />

        <div className="w-full max-w-[420px] space-y-6 relative">
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-sm rounded-2xl p-8">
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
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Click the link in the email to confirm your account. If you do not see the email, check your spam folder.
                </p>
              )}

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleResendEmail}
                  disabled={isResending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
                  {emailSent ? 'Resend confirmation email' : 'Send confirmation email'}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleBackToSignIn}
            className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </button>
        </div>
      </div>
    </>
  );
};

export default CheckEmail;
