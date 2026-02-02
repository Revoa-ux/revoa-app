import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { PageTitle } from '../components/PageTitle';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../contexts/AdminContext';
import { toast } from '../lib/toast';

type AuthMode = 'signin' | 'signup' | 'forgot-password' | 'reset-success';

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
  
  const { signIn, signUp, resetPassword, isAuthenticated, hasCompletedOnboarding } = useAuth();
  const { checkAdminStatus } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If this is an admin route, do not handle redirects
    if (location.pathname.startsWith('/admin')) {
      return;
    }

    // Handle regular auth flow
    if (isAuthenticated) {
      if (!hasCompletedOnboarding) {
        navigate('/onboarding/store', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
      return;
    }

    // Set initial mode based on URL
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
  }, [isAuthenticated, hasCompletedOnboarding, navigate, location]);
  
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

        // If email is from revoa.app domain, check admin status
        if (email.endsWith('@revoa.app')) {
          await checkAdminStatus();
          navigate('/admin/dashboard', { replace: true });
        } else {
          // Regular user flow
          if (!hasCompletedOnboarding) {
            navigate('/onboarding/store', { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        }
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
          if (email.endsWith('@revoa.app')) {
            await checkAdminStatus();
            navigate('/admin/dashboard', { replace: true });
          } else {
            navigate('/onboarding/store', { replace: true });
          }
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
  
  return (
    <>
      <PageTitle title={mode === 'signup' ? 'Sign Up' : 'Sign In'} />
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        {/* Grid Background */}
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
              <div className="w-32 h-8 relative">
                <img 
                  src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Revoa%20Transparent%20Icon.png" 
                  alt="Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <h2 className="text-3xl font-medium text-gray-900">
              {mode === 'signin' && 'Sign in to your account'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'forgot-password' && 'Reset your password'}
              {mode === 'reset-success' && 'Check your email'}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {mode === 'signin' && (
                <>
                  Don't have an account?{' '}
                  <button
                    onClick={() => handleModeChange('signup')}
                    className="font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:underline transition ease-in-out duration-150"
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
                    className="font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:underline transition ease-in-out duration-150"
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
                    className="font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:underline transition ease-in-out duration-150"
                  >
                    Sign in
                  </button>
                </>
              )}
              {mode === 'reset-success' && 'We sent you an email with a link to reset your password.'}
            </p>
          </div>

          <div className="bg-white/70 backdrop-blur-sm shadow-sm rounded-2xl p-8">
            {mode !== 'reset-success' ? (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
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
                        "block w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm",
                        validationErrors.email ? "border-red-300" : "border-gray-300"
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
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
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
                          "block w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm",
                          validationErrors.password ? "border-red-300" : "border-gray-300"
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
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
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
                          "block w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm",
                          validationErrors.confirmPassword ? "border-red-300" : "border-gray-300"
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
                      <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded"
                        disabled={isLoading}
                      />
                      <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                        Remember me
                      </label>
                    </div>

                    <div className="text-sm">
                      <button
                        type="button"
                        onClick={() => setMode('forgot-password')}
                        className="font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:underline transition ease-in-out duration-150"
                        disabled={isLoading}
                      >
                        Forgot your password?
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[linear-gradient(135deg,#E11D48_40%,#EC4899_80%,#E8795A_100%)] hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      {mode === 'signin' && 'Sign in'}
                      {mode === 'signup' && 'Sign up'}
                      {mode === 'forgot-password' && 'Reset password'}
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <ArrowRight className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm text-gray-600 mb-6">
                  We've sent a password reset link to <strong>{email}</strong>. Please check your email and follow the instructions to reset your password.
                </p>
                <button
                  onClick={() => handleModeChange('signin')}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[linear-gradient(135deg,#E11D48_40%,#EC4899_80%,#E8795A_100%)] hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
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
