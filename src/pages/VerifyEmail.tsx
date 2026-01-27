import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';
import { StatusIcon } from '../components/StatusIcon';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link. Please request a new one.');
        return;
      }

      try {
        // Get the verification token
        const { data: tokenData, error: tokenError } = await supabase
          .from('email_verification_tokens')
          .select('*')
          .eq('token', token)
          .is('verified_at', null)
          .maybeSingle();

        if (tokenError || !tokenData) {
          setStatus('error');
          setMessage('Invalid or expired verification link.');
          return;
        }

        // Check if expired
        if (new Date(tokenData.expires_at) < new Date()) {
          setStatus('error');
          setMessage('This verification link has expired. Please request a new one.');
          return;
        }

        // Update user email
        const { error: updateError } = await supabase.auth.updateUser({
          email: tokenData.new_email,
        });

        if (updateError) {
          console.error('Error updating email:', updateError);
          setStatus('error');
          setMessage('Failed to update email. Please try again.');
          return;
        }

        // Mark token as verified
        await supabase
          .from('email_verification_tokens')
          .update({ verified_at: new Date().toISOString() })
          .eq('id', tokenData.id);

        setStatus('success');
        setMessage('Your email has been verified successfully!');
        toast.success('Email verified successfully');

        // Redirect to settings after 2 seconds
        setTimeout(() => {
          navigate('/settings');
        }, 2000);
      } catch (error) {
        console.error('Error verifying email:', error);
        setStatus('error');
        setMessage('An error occurred while verifying your email.');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
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
      <div className="max-w-md w-full">
        <div className="bg-white/70 dark:bg-dark/70 backdrop-blur-sm shadow-sm rounded-2xl p-8">
          {status === 'verifying' && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <StatusIcon variant="loading" size="xl" />
              </div>
              <h1 className="text-3xl font-medium text-gray-900 dark:text-white mb-3">
                Verifying Email
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                {message}
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <StatusIcon variant="success" size="xl" />
              </div>
              <h1 className="text-3xl font-medium text-gray-900 dark:text-white mb-3">
                Email Verified
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400 mb-4">
                {message}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Redirecting to settings...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-6">
              <div>
                <div className="flex justify-center mb-6">
                  <StatusIcon variant="error" size="xl" />
                </div>
                <h1 className="text-3xl font-medium text-gray-900 dark:text-white mb-3">
                  Verification Failed
                </h1>
                <p className="mt-1 text-gray-600 dark:text-gray-400">
                  {message}
                </p>
              </div>
              <button
                onClick={() => navigate('/settings')}
                className="group w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-dark hover:bg-black hover:shadow-md dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Go to Settings
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
