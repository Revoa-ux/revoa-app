import React, { useState } from 'react';
import { X, Calendar, DollarSign, FileText, Clock, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { UserProfile } from '@/types/admin';
import { toast } from 'sonner';

interface UserProfileModalProps {
  user: UserProfile;
  onClose: () => void;
  onStatusChange?: (userId: string, status: string) => Promise<void>;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  onClose,
  onStatusChange
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const handleStatusChange = async (status: string) => {
    if (!onStatusChange) return;

    try {
      setIsLoading(true);
      await onStatusChange(user.userId, status);
      toast.success('User status updated successfully');
      setShowStatusDropdown(false);
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      
      <div className="fixed inset-0 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          <div className="relative bg-white rounded-xl w-full max-w-2xl">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">User Profile</h3>
                <button 
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                {/* User Info */}
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl font-medium text-gray-600">
                      {user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-gray-900">{user.email}</h4>
                    <p className="text-sm text-gray-500">ID: {user.userId}</p>
                    <div className="mt-2 flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.metadata?.status === 'active'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-yellow-50 text-yellow-700'
                      }`}>
                        {user.metadata?.status || 'Pending'}
                      </span>
                      <button
                        onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                        disabled={isLoading}
                        className="text-xs text-primary-600 hover:text-primary-700"
                      >
                        Change Status
                      </button>
                      {showStatusDropdown && (
                        <div className="absolute mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                          {['active', 'inactive', 'pending'].map((status) => (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(status)}
                              className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
                            >
                              <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                              {user.metadata?.status === status && (
                                <Check className="w-4 h-4 text-primary-500" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Registration Date</p>
                          <p className="text-sm text-gray-500">
                            {new Date(user.registrationDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Last Login</p>
                          <p className="text-sm text-gray-500">
                            {user.metadata?.lastLogin
                              ? new Date(user.metadata.lastLogin).toLocaleString()
                              : 'Never'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <DollarSign className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Total Volume</p>
                          <p className="text-sm text-gray-500">
                            ${user.totalVolume.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Total Invoices</p>
                          <p className="text-sm text-gray-500">
                            {user.invoiceCount} invoices
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes or Warnings */}
                {user.metadata?.warnings && (
                  <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-900">Account Warnings</p>
                        <p className="text-sm text-yellow-600 mt-1">
                          {user.metadata.warnings}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {/* Implement edit action */}}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Edit Profile'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;