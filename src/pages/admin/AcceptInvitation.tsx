import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Shield, ShieldCheck, Lock, Mail, User, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { toast } from '../../lib/toast';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { LoadingPage } from '@/components/LoadingPage';
import Button from '@/components/Button';
import { passwordSchema } from '@/lib/adminProfileValidation';
import { z } from 'zod';

interface InvitationData {
  email: string;
  role: 'admin' | 'super_admin';
  invited_by_email: string;
  expires_at: string;
}

const signupSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState({
    password: false,
    confirm: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    // Clear any existing session to avoid conflicts
    const clearSessionAndValidate = async () => {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Error clearing session:', err);
      }
      validateInvitation();
    };

    clearSessionAndValidate();
  }, [token]);

  const validateInvitation = async () => {
    try {
      // Use anon client to bypass RLS for invitation lookup
      const anonClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );

      // Fetch invitation details - try both id and invitation_token for backwards compatibility
      let data: any = null;
      let inviteError: any = null;

      // First try with invitation_token (the token in the URL)
      const { data: tokenData, error: tokenError } = await anonClient
        .from('admin_invitations')
        .select('email, role, expires_at, status')
        .eq('invitation_token', token)
        .maybeSingle();

      if (tokenData) {
        data = tokenData;
      } else {
        // Fallback: try with id (in case the token is actually the invitation id)
        const { data: idData, error: idError } = await anonClient
          .from('admin_invitations')
          .select('email, role, expires_at, status')
          .eq('id', token)
          .maybeSingle();

        data = idData;
        inviteError = idError;
      }

      if (inviteError || !data) {
        console.error('Invitation lookup failed:', { tokenError, inviteError, token });
        setError('Invalid or expired invitation');
        setLoading(false);
        return;
      }

      if (data.status !== 'pending') {
        setError('This invitation has already been used or revoked');
        setLoading(false);
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setError('This invitation has expired');
        setLoading(false);
        return;
      }

      setInvitation({
        email: data.email,
        role: data.role,
        invited_by_email: 'Revoa Admin',
        expires_at: data.expires_at,
      });
    } catch (err) {
      console.error('Error validating invitation:', err);
      setError('Failed to validate invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = signupSchema.safeParse(formData);
    if (!validation.success) {
      const newErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        newErrors[path] = issue.message;
      });
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);

    try {
      // Try to sign up first
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invitation!.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
          },
        },
      });

      // If user already exists, try signing in instead
      if (signUpError?.message?.includes('already registered') || signUpError?.message?.includes('User already registered')) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: invitation!.email,
          password: formData.password,
        });

        if (signInError) {
          throw new Error('An account with this email already exists. Please use the correct password to sign in and accept the invitation.');
        }

        if (!signInData.user) throw new Error('Failed to sign in');

        // Promote existing user to admin
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({
            is_admin: true,
            admin_role: invitation!.role,
            is_super_admin: invitation!.role === 'super_admin',
          })
          .eq('user_id', signInData.user.id);

        if (profileError) throw profileError;

        // Mark invitation as accepted - try multiple methods to ensure update succeeds
        let updateError = null;

        // First try with invitation_token
        const { error: tokenError, data: tokenData } = await supabase
          .from('admin_invitations')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString(),
          })
          .eq('invitation_token', token)
          .eq('email', invitation!.email)
          .select();

        if (tokenError || !tokenData || tokenData.length === 0) {
          // Fallback: try with just email and pending status
          const { error: emailError } = await supabase
            .from('admin_invitations')
            .update({
              status: 'accepted',
              accepted_at: new Date().toISOString(),
            })
            .eq('email', invitation!.email)
            .eq('status', 'pending')
            .select();

          updateError = emailError;
        }

        if (updateError) {
          console.error('Failed to update invitation status:', updateError);
        }

        // Use window.location to ensure AdminContext reloads with new admin status
        window.location.href = '/admin/dashboard';
        return;
      }

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Failed to create user');

      // Update new user profile to admin
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          display_name: `${formData.firstName} ${formData.lastName}`,
          is_admin: true,
          admin_role: invitation!.role,
          is_super_admin: invitation!.role === 'super_admin',
        })
        .eq('user_id', authData.user.id);

      if (profileError) throw profileError;

      // Mark invitation as accepted - try multiple methods to ensure update succeeds
      let updateError = null;

      // First try with invitation_token
      const { error: tokenError, data: tokenData } = await supabase
        .from('admin_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('invitation_token', token)
        .eq('email', invitation!.email)
        .select();

      if (tokenError || !tokenData || tokenData.length === 0) {
        // Fallback: try with just email and pending status
        const { error: emailError } = await supabase
          .from('admin_invitations')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString(),
          })
          .eq('email', invitation!.email)
          .eq('status', 'pending')
          .select();

        updateError = emailError;
      }

      if (updateError) {
        console.error('Failed to update invitation status:', updateError);
      }

      // Use window.location to ensure AdminContext reloads with new admin status
      window.location.href = '/admin/profile-setup';
    } catch (err: any) {
      console.error('Error creating account:', err);
      toast.error(err.message || 'Failed to create account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingPage />;
  }

  if (error) {
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
        <div className="w-full max-w-md">
          <div className="bg-white/70 dark:bg-dark/70 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-[#3a3a3a] p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Invalid Invitation
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <Button
              variant="primary"
              size="lg"
              onClick={() => window.location.href = 'https://revoa.app'}
              fullWidth
              className="!bg-dark hover:!bg-gray-800 dark:!bg-gray-800 dark:hover:!bg-gray-700"
            >
              Go to Revoa.app
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  const RoleIcon = invitation.role === 'super_admin' ? ShieldCheck : Shield;
  const roleDisplay = invitation.role === 'super_admin' ? 'Super Admin' : 'Admin';

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 py-12"
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
      <div className="w-full max-w-lg">
        {/* Header - Outside the card */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-3">
            <CheckCircle2 className="w-10 h-10 text-[#E85B81]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            You're Invited!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1.5 text-sm">
            Join Revoa as {roleDisplay === 'Super Admin' ? 'a' : 'an'} {roleDisplay}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white/70 dark:bg-dark/70 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-[#3a3a3a]">
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    First Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                      className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-white dark:bg-[#3a3a3a] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#E85B81] ${
                        errors.firstName ? 'border-red-500' : 'border-gray-300 dark:border-[#4a4a4a]'
                      }`}
                      placeholder="John"
                    />
                  </div>
                  {errors.firstName && (
                    <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Last Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleChange('lastName', e.target.value)}
                      className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-white dark:bg-[#3a3a3a] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#E85B81] ${
                        errors.lastName ? 'border-red-500' : 'border-gray-300 dark:border-[#4a4a4a]'
                      }`}
                      placeholder="Doe"
                    />
                  </div>
                  {errors.lastName && (
                    <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={invitation.email}
                    disabled
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-gray-50 dark:bg-[#3a3a3a]/50 text-gray-500 dark:text-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword.password ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    className={`w-full pl-9 pr-10 py-2 text-sm border rounded-lg bg-white dark:bg-[#3a3a3a] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#E85B81] ${
                      errors.password ? 'border-red-500' : 'border-gray-300 dark:border-[#4a4a4a]'
                    }`}
                    placeholder="Enter a strong password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => ({ ...prev, password: !prev.password }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#E85B81] rounded"
                  >
                    {showPassword.password ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{errors.password}</p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Must be at least 8 characters with uppercase, lowercase, number, and special character
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword.confirm ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    className={`w-full pl-9 pr-10 py-2 text-sm border rounded-lg bg-white dark:bg-[#3a3a3a] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#E85B81] ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-300 dark:border-[#4a4a4a]'
                    }`}
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#E85B81] rounded"
                  >
                    {showPassword.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>
                )}
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="group relative w-full bg-dark hover:bg-gray-800 dark:bg-dark dark:hover:bg-[#3a3a3a] text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-[#E85B81]"
                >
                  <span className="flex items-center gap-2">
                    {submitting ? 'Creating Account...' : 'Accept Invitation & Create Account'}
                    {!submitting && (
                      <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                    )}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
