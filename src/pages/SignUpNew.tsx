import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { PageTitle } from '../components/PageTitle';
import { validateForm, signupFormSchema } from '../lib/validation';

const PENDING_QUOTE_KEY = 'pending_quote';

type QuotePlatform = 'aliexpress' | 'amazon' | '1688' | 'alibaba' | 'other';

interface PendingQuoteData {
  product_url: string;
  product_name: string;
  platform: QuotePlatform;
}

const normalizePlatform = (platform: string | null): QuotePlatform => {
  if (!platform) return 'other';
  const lower = platform.toLowerCase();
  if (lower === 'aliexpress') return 'aliexpress';
  if (lower === 'amazon') return 'amazon';
  if (lower === '1688') return '1688';
  if (lower === 'alibaba') return 'alibaba';
  return 'other';
};

const SignUpNew = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp } = useAuth();

  useEffect(() => {
    const quoteUrl = searchParams.get('quote_url');
    if (quoteUrl) {
      const pendingQuote: PendingQuoteData = {
        product_url: quoteUrl,
        product_name: searchParams.get('quote_name') || '',
        platform: normalizePlatform(searchParams.get('quote_platform')),
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
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
              <div className="w-24 h-24 relative">
                <img
                  src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Revoa%20Transparent%20Icon.png"
                  alt="Logo"
                  className="w-full h-full object-contain dark:invert dark:brightness-0 dark:contrast-200"
                />
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

          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-sm rounded-2xl p-8">
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
                    className={`block w-full pl-10 pr-3 py-2 border ${
                      errors.email ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                    } rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`}
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
                    className={`block w-full pl-10 pr-10 py-2 border ${
                      errors.password ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                    } rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`}
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
                    className={`block w-full pl-10 pr-10 py-2 border ${
                      errors.confirmPassword ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                    } rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`}
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
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[linear-gradient(135deg,#E11D48_40%,#EC4899_80%,#E8795A_100%)] hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <div className="flex items-center">
                    <span>Create Account</span>
                    <ArrowRight className="ml-2 -mr-1 w-4 h-4" />
                  </div>
                )}
              </button>
            </form>
          </div>

          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
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