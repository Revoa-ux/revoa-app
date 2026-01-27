import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { toast } from '../lib/toast';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { PageTitle } from '../components/PageTitle';
import { CustomCheckbox } from '../components/CustomCheckbox';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../contexts/AdminContext';

type AuthMode = 'signin' | 'signup' | 'forgot-password' | 'reset-success';

const PENDING_QUOTE_KEY = 'pending_quote';

interface PendingQuoteData {
  product_url: string;
  product_name: string;
}

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<AuthMode>('signin');
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [forceRender, setForceRender] = useState(false);

  const { signIn, signUp, resetPassword, isAuthenticated, hasCompletedOnboarding, emailConfirmed, profileLoaded, user, isLoading: authLoading } = useAuth();
  const { checkAdminStatus, isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Force render after 2 seconds to prevent getting stuck on external links
  useEffect(() => {
    const timer = setTimeout(() => {
      setForceRender(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Check for product_url parameter from landing page
  useEffect(() => {
    const productUrl = searchParams.get('product_url');
    const quoteUrl = searchParams.get('quote_url');

    if (productUrl || quoteUrl) {
      const pendingQuote: PendingQuoteData = {
        product_url: productUrl || quoteUrl || '',
        product_name: searchParams.get('quote_name') || '',
      };
      localStorage.setItem(PENDING_QUOTE_KEY, JSON.stringify(pendingQuote));
    }
  }, [searchParams]);

  // Set initial mode based on URL (do this immediately, not waiting for auth)
  useEffect(() => {
    if (location.pathname.includes('sign-up')) {
      setMode('signup');
    } else if (location.pathname.includes('sign-in')) {
      setMode('signin');
    }

    // Handle password reset mode
    const params = new URLSearchParams(location.search);
    if (params.get('mode') === 'reset-password') {
      setMode('forgot-password');
    }
  }, [location.pathname, location.search]);

  // Handle redirects (separate effect)
  useEffect(() => {
    // If this is an admin route, do not handle redirects
    if (location.pathname.startsWith('/admin')) {
      return;
    }

    // Wait for auth and admin status to load
    if (authLoading || adminLoading) {
      return;
    }

    // Handle regular auth flow
    if (isAuthenticated) {
      // IMPORTANT: Wait for profile to be loaded from database before making decisions
      if (!profileLoaded) {
        return;
      }

      // If user is admin, redirect to admin panel
      if (isAdmin) {
        navigate('/admin/dashboard', { replace: true });
        return;
      }

      // If email not confirmed, redirect to check email page
      if (emailConfirmed === false) {
        navigate('/check-email', { replace: true, state: { email: user?.email } });
        return;
      }

      // Regular users go through onboarding
      if (!hasCompletedOnboarding) {
        navigate('/onboarding/store', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
      return;
    }
  }, [isAuthenticated, hasCompletedOnboarding, isAdmin, adminLoading, authLoading, navigate, location, emailConfirmed, profileLoaded, user]);
  
  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };
  
  const validatePassword = (password: string) => {
    return password.length >= 8;
  };
  
  const validateForm = () => {
    const errors: {
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};
    
    if (!email) {
      errors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (mode !== 'forgot-password') {
      if (!password) {
        errors.password = 'Password is required';
      } else if (!validatePassword(password)) {
        errors.password = 'Password must be at least 8 characters';
      }
      
      if (mode === 'signup') {
        if (!confirmPassword) {
          errors.confirmPassword = 'Please confirm your password';
        } else if (password !== confirmPassword) {
          errors.confirmPassword = 'Passwords do not match';
        }
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setValidationErrors({});
    
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setValidationErrors({
              email: 'Invalid email or password',
              password: 'Invalid email or password'
            });
            return;
          }
          throw error;
        }

        // Check admin status after login
        await checkAdminStatus();

        // Navigation will be handled by the useEffect above
      } else if (mode === 'signup') {
        const { error, data } = await signUp(email, password);
        if (error) {
          if (error.message.includes('already registered')) {
            setValidationErrors({
              email: 'This email is already registered'
            });
            return;
          }
          throw error;
        }
        
        if (data) {
          await checkAdminStatus();
          // Navigation will be handled by the useEffect above
        }
      } else if (mode === 'forgot-password') {
        const { error } = await resetPassword(email);
        if (error) {
          if (error.message.includes('not found')) {
            setValidationErrors({
              email: 'No account found with this email'
            });
            return;
          }
          throw error;
        }
        setMode('reset-success');
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast.error('Failed to sign in. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    setValidationErrors({});
    
    if (newMode === 'signin') {
      navigate('/sign-in', { replace: true });
    } else if (newMode === 'signup') {
      navigate('/sign-up', { replace: true });
    }
  };
  
  // Show loading state while auth is initializing (but force render after timeout)
  if ((authLoading || adminLoading) && !forceRender) {
    return (
      <>
        <PageTitle title={mode === 'signup' ? 'Sign Up' : 'Sign In'} />
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
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400 dark:text-gray-600" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageTitle title={mode === 'signup' ? 'Sign Up' : 'Sign In'} />
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
            --auth-circle-shadow: inset 0px 4px 12px 0px rgba(255,255,255,0.8), inset 0px -2px 4px 0px rgba(0,0,0,0.1);
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
            --auth-circle-shadow: inset 0px 4px 12px 0px rgba(255,255,255,0.35), inset 0px -2px 4px 0px rgba(0,0,0,0.3);
          }
        `}</style>

        <div className="w-full max-w-[420px] space-y-8 relative">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm bg-gray-200/50 dark:bg-zinc-600/20">
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center bg-gray-100 dark:bg-[#2a2a2a]"
                  style={{
                    boxShadow: 'var(--auth-circle-shadow)'
                  }}
                >
                  <img
                    src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Revoa%20Transparent%20Icon.png"
                    alt="Logo"
                    className="w-14 h-14 object-contain mt-0.5 dark:invert dark:brightness-200"
                  />
                </div>
              </div>
            </div>
            <h2 className="text-3xl font-medium text-gray-900 dark:text-white">
              {mode === 'signin' && 'Sign in to your account'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'forgot-password' && 'Reset your password'}
              {mode === 'reset-success' && 'Check your email'}
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {mode === 'signin' && (
                <>
                  Don't have an account?{' '}
                  <button
                    onClick={() => handleModeChange('signup')}
                    className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 focus:outline-none focus:underline transition ease-in-out duration-150"
                  >
                    Sign up
                  </button>
                </>
              )}
              {mode === 'signup' && (
                <>
                  Already have an account?{' '}
                  <button
                    onClick={() => handleModeChange('signin')}
                    className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 focus:outline-none focus:underline transition ease-in-out duration-150"
                  >
                    Sign in
                  </button>
                </>
              )}
              {mode === 'forgot-password' && (
                <>
                  Remember your password?{' '}
                  <button
                    onClick={() => handleModeChange('signin')}
                    className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 focus:outline-none focus:underline transition ease-in-out duration-150"
                  >
                    Sign in
                  </button>
                </>
              )}
              {mode === 'reset-success' && 'We sent you an email with a link to reset your password.'}
            </p>
          </div>

          <div className="bg-white dark:bg-[#1f1f1f] shadow-sm rounded-2xl p-8">
            {mode !== 'reset-success' ? (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email address
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setValidationErrors(prev => ({ ...prev, email: undefined }));
                      }}
                      className={cn(
                        "block w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 dark:focus:ring-gray-400 dark:focus:border-gray-400 sm:text-sm bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500",
                        validationErrors.email ? "border-red-300 dark:border-red-600" : "border-gray-300 dark:border-[#404040]"
                      )}
                      placeholder="you@example.com"
                      disabled={isLoading}
                    />
                  </div>
                  {validationErrors.email && (
                    <p className="mt-2 text-sm text-red-600">{validationErrors.email}</p>
                  )}
                </div>

                {mode !== 'forgot-password' && (
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Password
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={mode === 'signin' ? "current-password" : "new-password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setValidationErrors(prev => ({ ...prev, password: undefined }));
                        }}
                        className={cn(
                          "block w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 dark:focus:ring-gray-400 dark:focus:border-gray-400 sm:text-sm bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500",
                          validationErrors.password ? "border-red-300 dark:border-red-600" : "border-gray-300 dark:border-[#404040]"
                        )}
                        placeholder="••••••••"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {validationErrors.password && (
                      <p className="mt-2 text-sm text-red-600">{validationErrors.password}</p>
                    )}
                  </div>
                )}

                {mode === 'signup' && (
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Confirm Password
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setValidationErrors(prev => ({ ...prev, confirmPassword: undefined }));
                        }}
                        className={cn(
                          "block w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 dark:focus:ring-gray-400 dark:focus:border-gray-400 sm:text-sm bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500",
                          validationErrors.confirmPassword ? "border-red-300 dark:border-red-600" : "border-gray-300 dark:border-[#404040]"
                        )}
                        placeholder="••••••••"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {validationErrors.confirmPassword && (
                      <p className="mt-2 text-sm text-red-600">{validationErrors.confirmPassword}</p>
                    )}
                  </div>
                )}

                {mode === 'signin' && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CustomCheckbox
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300 cursor-pointer">
                        Remember me
                      </label>
                    </div>

                    <div className="text-sm">
                      <button
                        type="button"
                        onClick={() => setMode('forgot-password')}
                        className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 focus:outline-none focus:underline transition ease-in-out duration-150"
                        disabled={isLoading}
                      >
                        Forgot your password?
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !email || (mode !== 'forgot-password' && !password) || (mode === 'signup' && !confirmPassword)}
                  className="group w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-900 dark:border-[#4a4a4a] rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:cursor-not-allowed disabled:opacity-50 text-white bg-gray-800 dark:bg-[#3a3a3a] enabled:hover:bg-gray-700 dark:enabled:hover:bg-[#4a4a4a]"
                  style={{
                    boxShadow: 'inset 0 -3px 2px rgba(0, 0, 0, 0.4), inset 0 2px 0.4px rgba(255, 255, 255, 0.14)'
                  }}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      {mode === 'signin' && 'Sign in'}
                      {mode === 'signup' && 'Create account'}
                      {mode === 'forgot-password' && 'Reset password'}
                      <ArrowRight className="w-4 h-4 group-enabled:group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="text-center">
                <div className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm mx-auto mb-4" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)' }}>
                  <div
                    className="h-12 w-12 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: '#10B981',
                      boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                    }}
                  >
                    <ArrowRight className="h-6 w-6 text-white" strokeWidth={2.5} />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                  We've sent a password reset link to <strong>{email}</strong>. Please check your email and follow the instructions to reset your password.
                </p>
                <button
                  onClick={() => handleModeChange('signin')}
                  className="w-full flex justify-center py-2.5 px-4 border border-gray-900 dark:border-[#4a4a4a] rounded-lg text-sm font-medium text-white bg-gray-800 dark:bg-[#3a3a3a] hover:bg-gray-700 dark:hover:bg-[#4a4a4a] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  style={{
                    boxShadow: 'inset 0 -3px 2px rgba(0, 0, 0, 0.4), inset 0 2px 0.4px rgba(255, 255, 255, 0.14)'
                  }}
                >
                  Back to sign in
                </button>
              </div>
            )}
          </div>

          <p className="text-xs text-center text-gray-500">
            By signing up, you agree to our{' '}
            <a href="#" className="font-medium text-primary-600 hover:text-primary-500">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="font-medium text-primary-600 hover:text-primary-500">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </>
  );
};

export default Auth;
