import React, { useState, useRef, useEffect } from 'react';
import {
  MoreVertical,
  User,
  Key,
  Power,
  UserMinus,
  UserPlus
} from 'lucide-react';
import { toast } from 'sonner';
import { useClickOutside } from '@/lib/useClickOutside';

interface UserActionsMenuProps {
  userId: string;
  userEmail?: string;
  isActive?: boolean;
  isAssigned?: boolean;
  onViewProfile: (userId: string) => void;
  onResetPassword: (userId: string) => void;
  onToggleStatus: (userId: string, active: boolean) => void;
  onReassign: (userId: string) => void;
  onRemoveAssignment: (userId: string) => void;
}

export const UserActionsMenu: React.FC<UserActionsMenuProps> = ({
  userId,
  userEmail, // eslint-disable-line @typescript-eslint/no-unused-vars
  isActive = true,
  isAssigned = false,
  onViewProfile,
  onResetPassword,
  onToggleStatus,
  onReassign,
  onRemoveAssignment
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  useClickOutside(menuRef, () => setIsOpen(false), [buttonRef]);

  useEffect(() => {
    if (!isOpen || !buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    const menuHeight = 280; // Approximate height of dropdown menu

    setDropdownPosition(spaceBelow >= menuHeight || spaceBelow >= spaceAbove ? 'bottom' : 'top');
  }, [isOpen]);

  const handleAction = (action: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 focus:border-gray-200 dark:focus:border-gray-700"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="fixed z-50 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
          style={{
            ...(dropdownPosition === 'bottom' ? {
              top: buttonRef.current?.getBoundingClientRect().bottom,
            } : {
              bottom: window.innerHeight - (buttonRef.current?.getBoundingClientRect().top || 0),
            }),
            right: window.innerWidth - (buttonRef.current?.getBoundingClientRect().right || 0),
            transformOrigin: dropdownPosition === 'bottom' ? 'top right' : 'bottom right',
            animation: 'dropdown-in 0.2s ease-out'
          }}
        >
          <button
            onClick={handleAction(() => onViewProfile(userId))}
            className="flex items-center w-full px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors relative group rounded-t-lg"
          >
            <User className="w-4 h-4 mr-3" />
            View Profile
          </button>

          <button
            onClick={handleAction(() => onResetPassword(userId))}
            className="flex items-center w-full px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors relative group"
          >
            <Key className="w-4 h-4 mr-3" />
            Reset Password
          </button>

          <button
            onClick={handleAction(() => onToggleStatus(userId, !isActive))}
            className="flex items-center w-full px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors relative group"
          >
            <Power className="w-4 h-4 mr-3" />
            {isActive ? 'Disable Account' : 'Enable Account'}
          </button>

          <button
            onClick={handleAction(() => onReassign(userId))}
            className="flex items-center w-full px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors relative group"
          >
            <UserPlus className="w-4 h-4 mr-3" />
            {isAssigned ? 'Reassign User' : 'Assign User'}
          </button>

          {isAssigned && (
            <button
              onClick={handleAction(() => onRemoveAssignment(userId))}
              className="flex items-center w-full px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors relative group rounded-b-lg"
            >
              <UserMinus className="w-4 h-4 mr-3" />
              Remove Assignment
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default UserActionsMenu;