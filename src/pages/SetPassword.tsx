import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Check, AlertCircle, Loader2, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';
import { PageTitle } from '../components/PageTitle';

type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

const getPasswordStrength = (password: string): PasswordStrength => {
  if (password.length < 8) return 'weak';

  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  if (password.length >= 10 && hasUpperCase && hasNumber && hasSymbol) return 'strong';
  if (hasUpperCase && hasNumber) return 'good';
  if (hasUpperCase || hasNumber) return 'fair';

  return 'weak';
};

const PasswordStrengthMeter: React.FC<{ strength: PasswordStrength }> = ({ strength }) => {
  const colors = {
    weak: 'bg-red-500',
    fair: 'bg-orange-500',
    good: 'bg-yellow-500',
    strong: 'bg-emerald-500'
  };

  const widths = {
    weak: 'w-1/4',
    fair: 'w-2/4',
    good: 'w-3/4',
    strong: 'w-full'
  };

  const labels = {
    weak: 'Weak',
    fair: 'Fair',
    good: 'Good',
    strong: 'Strong'
  };

  return (
    <div className="mt-2">
      <div className="h-1.5 bg-gray-200 dark:bg-[#3a3a3a] rounded-full overflow-hidden">
        <div className={`h-full ${colors[strength]} ${widths[strength]} transition-all duration-300`} />
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
        Password strength: <span className="font-medium">{labels[strength]}</span>
      </p>
    </div>
  );
};

const SetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canSubmit = password.length >= 8 && passwordsMatch && !isSubmitting;

  useEffect(() => {
    const validateToken = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setErrorMessage('Invalid password setup link. Please request a new one.');
        setIsValidating(false);
        return;
      }

      try {
        // Verify the recovery token
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'recovery'
        });

        if (error || !data.user?.email) {
          console.error('Token validation error:', error);
          setErrorMessage('This link has expired or is invalid. Please request a new password setup link.');
          setIsValidating(false);
          return;
        }

        setEmail(data.user.email);
        setTokenValid(true);
        setIsValidating(false);
      } catch (error) {
        console.error('Error validating token:', error);
        setErrorMessage('An unexpected error occurred. Please try again.');
        setIsValidating(false);
      }
    };

    validateToken();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit) return;

    setIsSubmitting(true);

    try {
      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        toast.error('Failed to set password: ' + updateError.message);
        setIsSubmitting(false);
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Unable to verify user session');
        setIsSubmitting(false);
        return;
      }

      // Update user_profiles to mark password as set
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          password_set: true,
          password_set_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        // Don't block on this error
      }

      toast.success('Password set successfully!');

      // Redirect to dashboard after a brief delay
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 1000);

    } catch (error) {
      console.error('Error setting password:', error);
      toast.error('An unexpected error occurred');
      setIsSubmitting(false);
    }
  };

  const handleResendLink = async () => {
    if (!email) {
      toast.error('Unable to resend link. Please contact support.');
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/set-password`
      });

      if (error) {
        toast.error('Failed to send email: ' + error.message);
        return;
      }

      toast.success('Password setup link sent to ' + email);
    } catch (error) {
      console.error('Error resending link:', error);
      toast.error('Failed to send email');
    }
  };

  if (isValidating) {
    return (
      <>
        <PageTitle title="Set Your Password" />
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
          <div className="w-full max-w-[420px] space-y-8 relative">
            <div className="bg-white/70 dark:bg-dark/70 backdrop-blur-sm shadow-sm rounded-2xl p-12">
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm" style={{ backgroundColor: 'rgba(14, 165, 233, 0.15)' }}>
                    <div
                      className="w-24 h-24 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: '#0EA5E9',
                        boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                      }}
                    >
                      <Loader2 className="w-12 h-12 text-white animate-spin" strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-medium text-gray-900 dark:text-white">
                    Validating Link
                  </h2>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    Please wait while we verify your password setup link...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!tokenValid) {
    return (
      <>
        <PageTitle title="Link Expired" />
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
          <div className="w-full max-w-[420px] space-y-8 relative">
            <div className="bg-white/70 dark:bg-dark/70 backdrop-blur-sm shadow-sm rounded-2xl p-8">
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm" style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)' }}>
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: '#F43F5E',
                        boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                      }}
                    >
                      <XCircle className="w-10 h-10 text-white" strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-medium text-gray-900 dark:text-white">
                    Link Expired
                  </h2>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    {errorMessage}
                  </p>
                </div>
                {email && (
                  <button
                    onClick={handleResendLink}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-dark hover:bg-black hover:shadow-md dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Resend Link
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageTitle title="Set Your Password" />
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

        <div className="w-full max-w-[420px] space-y-8 relative">
          <div className="bg-white/70 dark:bg-dark/70 backdrop-blur-sm shadow-sm rounded-2xl p-8">
            <div className="text-center space-y-6 mb-8">
              <div className="flex justify-center">
                <div className="w-16 h-16 relative">
                  <img
                    src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Revoa%20Transparent%20Icon.png"
                    alt="Revoa"
                    className="w-full h-full object-contain dark:invert dark:brightness-0 dark:contrast-200"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-medium text-gray-900 dark:text-white">
                  Set Your Password
                </h2>
                <p className="mt-1 text-gray-600 dark:text-gray-400">
                  Create a password to sign in directly to Revoa
                </p>
              </div>
            </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Display */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-3 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-gray-50 dark:bg-dark text-gray-900 dark:text-white cursor-not-allowed"
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {password.length > 0 && <PasswordStrengthMeter strength={passwordStrength} />}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                At least 8 characters, including uppercase and numbers
              </p>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <div className="flex items-center mt-2">
                  {passwordsMatch ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500 mr-1" />
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">Passwords match</p>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-500 mr-1" />
                      <p className="text-xs text-red-600 dark:text-red-400">Passwords do not match</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-dark hover:bg-black hover:shadow-md dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Setting password...
                </>
              ) : (
                'Set Password'
              )}
            </button>
          </form>
          </div>

          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            You can also access Revoa from your Shopify admin without a password
          </p>
        </div>
      </div>
    </>
  );
};

export default SetPassword;
