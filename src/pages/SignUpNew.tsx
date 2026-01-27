import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { toast } from '../lib/toast';
import { useAuth } from '../contexts/AuthContext';
import { PageTitle } from '../components/PageTitle';
import { validateForm, signupFormSchema } from '../lib/validation';
import { cn } from '../lib/utils';

const PENDING_QUOTE_KEY = 'pending_quote';

interface PendingQuoteData {
  product_url: string;
  product_name: string;
}

const SignUpNew = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp } = useAuth();

  useEffect(() => {
    // Support both old format (quote_url, quote_name) and new format (product_url)
    const quoteUrl = searchParams.get('quote_url');
    const productUrl = searchParams.get('product_url');

    if (quoteUrl || productUrl) {
      const pendingQuote: PendingQuoteData = {
        product_url: productUrl || quoteUrl || '',
        product_name: searchParams.get('quote_name') || '',
      };
      localStorage.setItem(PENDING_QUOTE_KEY, JSON.stringify(pendingQuote));
    }
  }, [searchParams]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear any existing errors
    setErrors({});

    // Validate form data
    const validation = await validateForm(signupFormSchema, formData);
    if (!validation.success) {
      setErrors({
        [validation.error?.includes('email') ? 'email' : 
         validation.error?.includes('password') ? 'password' : 
         'confirmPassword']: validation.error
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error, data } = await signUp(formData.email, formData.password);

      if (error) {
        if (error.message.includes('already registered')) {
          setErrors({ email: 'This email is already registered' });
          return;
        }
        throw error;
      }

      if (data?.user) {
        let emailSent = false;
        let emailError = null;

        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const response = await fetch(`${supabaseUrl}/functions/v1/send-signup-confirmation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: data.user.id,
              email: formData.email,
            }),
          });

          const result = await response.json();
          console.log('Email confirmation response:', result);

          emailSent = result.emailSent === true;
          if (!emailSent && result.message) {
            emailError = result.message;
          }
        } catch (err) {
          console.error('Failed to send confirmation email:', err);
          emailError = 'Failed to connect to email service';
        }

        navigate('/check-email', {
          replace: true,
          state: {
            email: formData.email,
            emailSent,
            emailError
          }
        });
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <PageTitle title="Sign Up" />
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
            <h2 className="text-3xl font-medium text-gray-900 dark:text-white">Create your account</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/auth')}
                className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 focus:outline-none focus:underline transition ease-in-out duration-150"
              >
                Sign in
              </button>
            </p>
          </div>

          <div className="bg-white dark:bg-[#1f1f1f] shadow-sm rounded-2xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
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
                    value={formData.email}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, email: e.target.value }));
                      setErrors(prev => ({ ...prev, email: undefined }));
                    }}
                    className={cn(
                      "block w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 dark:focus:ring-gray-400 dark:focus:border-gray-400 sm:text-sm bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500",
                      errors.email ? "border-red-300 dark:border-red-600" : "border-gray-300 dark:border-[#404040]"
                    )}
                    placeholder="you@example.com"
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

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
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, password: e.target.value }));
                      setErrors(prev => ({ ...prev, password: undefined }));
                    }}
                    className={cn(
                      "block w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 dark:focus:ring-gray-400 dark:focus:border-gray-400 sm:text-sm bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500",
                      errors.password ? "border-red-300 dark:border-red-600" : "border-gray-300 dark:border-[#404040]"
                    )}
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-2 text-sm text-red-600">{errors.password}</p>
                )}
              </div>

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
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, confirmPassword: e.target.value }));
                      setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                    }}
                    className={cn(
                      "block w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 dark:focus:ring-gray-400 dark:focus:border-gray-400 sm:text-sm bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500",
                      errors.confirmPassword ? "border-red-300 dark:border-red-600" : "border-gray-300 dark:border-[#404040]"
                    )}
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || !formData.email || !formData.password || !formData.confirmPassword}
                className="group w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-900 dark:border-[#4a4a4a] rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:cursor-not-allowed disabled:opacity-50 text-white bg-gray-800 dark:bg-[#3a3a3a] enabled:hover:bg-gray-700 dark:enabled:hover:bg-gray-600"
                style={{
                  boxShadow: 'inset 0 -3px 2px rgba(0, 0, 0, 0.4), inset 0 2px 0.4px rgba(255, 255, 255, 0.14)'
                }}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Create account
                    <ArrowRight className="w-4 h-4 group-enabled:group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>
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

export default SignUpNew;
