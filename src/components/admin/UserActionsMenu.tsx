import React, { useState, useRef, useEffect } from 'react';
import { 
  MoreVertical,
  User,
  Key,
  Power,
  UserMinus,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { useClickOutside } from '@/lib/useClickOutside';

interface UserActionsMenuProps {
  userId: string;
  isActive?: boolean;
  onViewProfile: (userId: string) => void;
  onResetPassword: (userId: string) => void;
  onToggleStatus: (userId: string, active: boolean) => void;
  onRemoveAssignment: (userId: string) => void;
}

export const UserActionsMenu: React.FC<UserActionsMenuProps> = ({
  userId,
  isActive = true,
  onViewProfile,
  onResetPassword,
  onToggleStatus,
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
        className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {isOpen && (
        <div 
          ref={menuRef}
          className="fixed z-50 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
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
            className="flex items-center w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 transition-colors relative group"
          >
            <User className="w-4 h-4 mr-3" />
            View Profile
          </button>
          
          <button
            onClick={handleAction(() => onResetPassword(userId))}
            className="flex items-center w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 transition-colors relative group"
          >
            <Key className="w-4 h-4 mr-3" />
            Reset Password
          </button>
          
          <button
            onClick={handleAction(() => onToggleStatus(userId, !isActive))}
            className="flex items-center w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 transition-colors relative group"
          >
            <Power className="w-4 h-4 mr-3" />
            {isActive ? 'Disable Account' : 'Enable Account'}
          </button>
          
          <button
            onClick={handleAction(() => onRemoveAssignment(userId))}
            className="flex items-center w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 transition-colors relative group"
          >
            <UserMinus className="w-4 h-4 mr-3" />
            Remove Assignment
          </button>
          
          <div className="h-px bg-gray-200 mx-3 my-1"></div>
          
          <button
            onClick={handleAction(() => {
              toast.success('User archived');
            })}
            className="flex items-center w-full px-4 py-2.5 text-sm text-left text-red-600 hover:bg-red-50 transition-colors relative group"
          >
            <Trash2 className="w-4 h-4 mr-3" />
            Archive User
          </button>
        </div>
      )}
    </div>
  );
};

export default UserActionsMenu;