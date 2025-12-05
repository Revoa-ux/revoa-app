import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          {status === 'verifying' && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-gray-600 dark:text-gray-300 animate-spin" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Verifying Email
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {message}
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Email Verified!
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {message}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Redirecting to settings...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Verification Failed
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {message}
              </p>
              <button
                onClick={() => navigate('/settings')}
                className="px-6 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:from-red-600 hover:to-pink-600 transition-all"
              >
                Go to Settings
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
