import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Building } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

interface ProfileData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  company: string;
}

interface ProfileFormProps {
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  onUpdate: (updates: Partial<ProfileData>) => Promise<void>;
}

const ProfileForm = ({ firstName, lastName, email, onUpdate }: ProfileFormProps) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    email: email || '',
    firstName: firstName || '',
    lastName: lastName || '',
    phone: '',
    company: '',
  });
  const [validationErrors, setValidationErrors] = useState<Partial<ProfileData>>({});

  useEffect(() => {
    setProfileData(prev => ({
      ...prev,
      email: email || user?.email || '',
      firstName: firstName || '',
      lastName: lastName || '',
      phone: prev.phone,  // Keep existing phone value
      company: prev.company,  // Keep existing company value
    }));
  }, [email, firstName, lastName, user]);

  const validateForm = (): boolean => {
    const errors: Partial<ProfileData> = {};
    
    if (!profileData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    
    if (!profileData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    
    if (!profileData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const saveProfile = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      await onUpdate(profileData);
      console.log('Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveProfile();
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-dark shadow rounded-lg">
        <div className="px-6 py-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                First Name
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  id="firstName"
                  value={profileData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  onBlur={saveProfile}
                  onKeyDown={handleKeyDown}
                  className={cn(
                    "block w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-[#3a3a3a] text-gray-900 dark:text-white",
                    validationErrors.firstName ? "border-red-300" : "border-gray-300 dark:border-[#4a4a4a]"
                  )}
                  placeholder="John"
                />
              </div>
              {validationErrors.firstName && (
                <p className="mt-2 text-sm text-red-600">{validationErrors.firstName}</p>
              )}
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Last Name
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  id="lastName"
                  value={profileData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  onBlur={saveProfile}
                  onKeyDown={handleKeyDown}
                  className={cn(
                    "block w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-[#3a3a3a] text-gray-900 dark:text-white",
                    validationErrors.lastName ? "border-red-300" : "border-gray-300 dark:border-[#4a4a4a]"
                  )}
                  placeholder="Doe"
                />
              </div>
              {validationErrors.lastName && (
                <p className="mt-2 text-sm text-red-600">{validationErrors.lastName}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email Address
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="email"
                id="email"
                value={profileData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onBlur={saveProfile}
                onKeyDown={handleKeyDown}
                className={cn(
                  "block w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-[#3a3a3a] text-gray-900 dark:text-white",
                  validationErrors.email ? "border-red-300" : "border-gray-300 dark:border-[#4a4a4a]"
                )}
                placeholder="john@example.com"
              />
            </div>
            {validationErrors.email && (
              <p className="mt-2 text-sm text-red-600">{validationErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Phone Number
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="tel"
                id="phone"
                value={profileData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                onBlur={saveProfile}
                onKeyDown={handleKeyDown}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-[#3a3a3a] text-gray-900 dark:text-white"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Company
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Building className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                id="company"
                value={profileData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                onBlur={saveProfile}
                onKeyDown={handleKeyDown}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-[#4a4a4a] rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-[#3a3a3a] text-gray-900 dark:text-white"
                placeholder="Acme Inc."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileForm;