import { useLocation, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { PageTitle } from '../components/PageTitle';

const CheckEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || '';
  const [isResending, setIsResending] = useState(false);

  const handleResendEmail = async () => {
    if (!email) {
      toast.error('Email address not found. Please sign up again.');
      return;
    }

    setIsResending(true);
    try {
      toast.info('If your account exists, a new confirmation email will be sent.');
    } catch {
      toast.error('Failed to resend email. Please try again.');
    } finally {
      setIsResending(false);
    }
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

        <div className="w-full max-w-[420px] space-y-8 relative">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center">
                <Mail className="w-10 h-10 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-medium text-gray-900 dark:text-white">Check your email</h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              We sent a confirmation link to
            </p>
            {email && (
              <p className="mt-1 text-lg font-medium text-gray-900 dark:text-white">
                {email}
              </p>
            )}
          </div>

          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-sm rounded-2xl p-8">
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                Click the link in the email to confirm your account. If you do not see the email, check your spam folder.
              </p>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleResendEmail}
                  disabled={isResending}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
                  Resend confirmation email
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/auth')}
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
