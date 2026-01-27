import React, { useState } from 'react';
import { X, Mail, UserPlus, Shield, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from '../../lib/toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Modal from '@/components/Modal';
import { CustomRadio } from '@/components/CustomRadio';
import { z } from 'zod';

interface InviteAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'super_admin'], { errorMap: () => ({ message: 'Please select a valid role' }) }),
});

export const InviteAdminModal: React.FC<InviteAdminModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'super_admin'>('admin');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrors({});

    const validation = inviteSchema.safeParse({ email, role });
    if (!validation.success) {
      const newErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        newErrors[path] = issue.message;
      });
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if email is already registered as admin
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('email, is_admin')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (existingProfile?.is_admin) {
        toast.error('This email is already registered as an admin');
        setIsSubmitting(false);
        return;
      }

      // Check if there's already a pending invitation
      const { data: existingInvitation } = await supabase
        .from('admin_invitations')
        .select('id, status')
        .eq('email', email.toLowerCase())
        .eq('status', 'pending')
        .maybeSingle();

      if (existingInvitation) {
        toast.error('There is already a pending invitation for this email');
        setIsSubmitting(false);
        return;
      }

      // Create invitation
      const { data: invitation, error: inviteError } = await supabase
        .from('admin_invitations')
        .insert({
          email: email.toLowerCase(),
          role,
          invited_by: user!.id,
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      // Call Edge Function to send invitation email
      const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-admin-invitation', {
        body: {
          email: email.toLowerCase(),
          role,
          invitation_token: invitation.invitation_token,
        },
      });

      if (emailError) {
        console.error('Email sending error:', emailError);
        toast.warning('Invitation created but email service encountered an error. Check console for details.');

        // Show the invitation link in console for manual sharing
        if (emailResult?.invitationLink) {
          console.log('Invitation link:', emailResult.invitationLink);
        }
      } else if (emailResult?.emailSent) {
        toast.success(`Invitation sent to ${email}`);
      } else {
        const errorMsg = emailResult?.emailError || 'Unknown error';
        toast.warning(emailResult?.message || 'Invitation created but email may not have been sent');

        // Log detailed error information
        console.group('📧 Email Sending Failed');
        console.error('Error:', errorMsg);
        if (emailResult?.emailDetails) {
          console.error('Details:', emailResult.emailDetails);
        }
        if (emailResult?.invitationLink) {
          console.log('Invitation link (share manually):', emailResult.invitationLink);
        }
        console.groupEnd();
      }

      setEmail('');
      setRole('admin');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setEmail('');
      setRole('admin');
      setErrors({});
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Invite New Admin">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email Address *
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) {
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.email;
                    return newErrors;
                  });
                }
              }}
              className={`w-full pl-10 pr-4 py-2.5 border rounded-lg bg-white dark:bg-[#3a3a3a] text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#E85B81]/20 focus:border-[#E85B81] transition-colors ${
                errors.email ? 'border-red-500' : 'border-gray-300 dark:border-[#4a4a4a]'
              }`}
              placeholder="admin@example.com"
              disabled={isSubmitting}
              required
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            An invitation email will be sent to this address
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Admin Role *
          </label>
          <div className="space-y-3">
            <label className="flex items-start p-4 border border-gray-300 dark:border-[#4a4a4a] rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors">
              <CustomRadio
                name="role"
                value="admin"
                checked={role === 'admin'}
                onChange={(e) => setRole(e.target.value as 'admin')}
                disabled={isSubmitting}
                className="mt-1"
              />
              <div className="ml-3 flex-1">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-white">Admin</span>
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Can manage users, quotes, conversations, and view analytics
                </p>
              </div>
            </label>

            <label className="flex items-start p-4 border border-gray-300 dark:border-[#4a4a4a] rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors">
              <CustomRadio
                name="role"
                value="super_admin"
                checked={role === 'super_admin'}
                onChange={(e) => setRole(e.target.value as 'super_admin')}
                disabled={isSubmitting}
                className="mt-1"
              />
              <div className="ml-3 flex-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-white">Super Admin</span>
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Full access including system settings, admin management, and all permissions
                </p>
              </div>
            </label>
          </div>
          {errors.role && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.role}</p>
          )}
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start">
            <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-200">Invitation Details</p>
              <ul className="mt-2 space-y-1 text-blue-700 dark:text-blue-300 list-disc list-inside">
                <li>Valid for 7 days</li>
                <li>One-time use only</li>
                <li>Recipient will need to create a password</li>
                <li>You'll be notified when accepted</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="btn btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="btn-icon animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <UserPlus className="btn-icon" />
                Send Invitation
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default InviteAdminModal;
