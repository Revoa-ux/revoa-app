# Admin Profile Management System

## Overview

A comprehensive admin profile management system that allows administrators and super administrators to manage their profile information securely and effectively. The system includes profile setup flow, ongoing profile editing, password management, notification preferences, and profile picture upload capabilities.

## Features Implemented

### 1. Database Schema

**New columns added to `user_profiles` table:**
- `profile_picture_url` - URL to profile picture in storage
- `display_name` - Preferred display name for admin
- `bio` - Optional bio/description (max 500 characters)
- `timezone` - User timezone preference
- `notification_preferences` - JSONB field for email/push/chat notification settings
- `profile_completed` - Boolean flag for profile completion status
- `profile_completed_at` - Timestamp when profile was completed

**Storage Bucket:**
- Created `admin-avatars` bucket for profile pictures
- 5MB file size limit
- Supported formats: JPEG, PNG, WebP, GIF
- Public read access, authenticated write access with RLS policies

**Database Features:**
- Automatic profile completion trigger
- Indexes for efficient querying
- Comprehensive RLS policies for security

### 2. Frontend Components

#### ProfilePictureUpload Component
Location: `src/components/admin/ProfilePictureUpload.tsx`

Features:
- Upload profile pictures with preview
- Delete existing profile pictures
- Real-time validation (file size, format)
- Responsive design with loading states
- Fallback to user initials when no picture exists

#### AdminProfileSetup Page
Location: `src/pages/admin/ProfileSetup.tsx`

Post-signup flow that includes:
- Profile picture upload
- First name and last name (required)
- Display name (auto-populated from first + last name)
- Phone number (optional)
- Timezone selection
- Bio (optional, 500 char limit)
- Real-time validation with error messages
- Automatic redirect if profile already completed

#### AdminProfileEdit Page
Location: `src/pages/admin/ProfileEdit.tsx`

Comprehensive profile management with three tabs:

**Profile Tab:**
- Edit all profile information
- Update profile picture
- Change timezone
- Update notification preferences

**Security Tab:**
- Change password with validation
- Current password verification
- Strong password requirements
- Show/hide password toggles

**Notifications Tab:**
- Toggle email notifications
- Toggle push notifications
- Toggle chat notifications

### 3. Backend Services

#### Admin Profile Service
Location: `src/lib/adminProfileService.ts`

Services:
- `getProfile()` - Fetch admin profile
- `setupProfile()` - Initial profile setup
- `updateProfile()` - Update profile fields
- `uploadProfilePicture()` - Upload and store profile picture
- `deleteProfilePicture()` - Remove profile picture
- `changePassword()` - Change password with verification
- `changeEmail()` - Change email with password confirmation
- `checkProfileCompletion()` - Check if profile is complete

All services include:
- Input sanitization
- Error handling
- Type safety

#### Validation System
Location: `src/lib/adminProfileValidation.ts`

Zod schemas for:
- Profile setup data
- Profile update data
- Password change (with complexity requirements)
- Email change
- Profile picture upload

Password requirements:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

Validation helpers:
- `validateProfileSetup()` - Validate initial setup
- `validatePasswordChange()` - Validate password changes
- `sanitizeInput()` - Sanitize user inputs
- `validateTimezone()` - Validate timezone strings

#### Edge Function
Location: `supabase/functions/admin-profile-operations/`

Features:
- Rate limiting for sensitive operations (10 requests per minute)
- Profile validation endpoint
- Password change endpoint with verification
- Audit logging for admin actions
- JWT verification and admin authorization

Endpoints:
- `POST /validate-profile` - Server-side profile validation
- `POST /change-password` - Secure password change
- `POST /audit-log` - Log admin actions

### 4. Security Features

**Authentication & Authorization:**
- JWT verification on all requests
- Admin role verification
- Users can only access their own profiles
- Super admins have view access to all admin profiles

**Rate Limiting:**
- 10 requests per minute for password changes
- Prevents brute force attacks
- In-memory rate limit tracking

**Input Validation:**
- Client-side validation with Zod
- Server-side validation in Edge Functions
- XSS protection through input sanitization
- SQL injection prevention through parameterized queries

**Password Security:**
- Strong password requirements
- Current password verification for changes
- Secure password hashing by Supabase Auth
- Password strength indicators

**File Upload Security:**
- File size limits (5MB)
- MIME type validation
- Secure file storage with Supabase Storage
- RLS policies for storage access

### 5. User Experience Features

**Responsive Design:**
- Mobile-first approach
- Adapts to all screen sizes
- Touch-friendly interface

**Loading States:**
- Skeleton loaders
- Loading indicators
- Disabled states during operations

**Error Handling:**
- Clear error messages
- Field-level validation feedback
- Toast notifications for success/error states

**Accessibility:**
- Proper ARIA labels
- Keyboard navigation support
- Screen reader friendly
- High contrast text

### 6. Routes

**New Routes Added:**
- `/admin/profile-setup` - Initial profile setup (standalone)
- `/admin/profile` - Profile management (within admin layout)

**Navigation:**
- Added "My Profile" link to admin sidebar
- Automatic redirect to setup if profile incomplete
- Automatic redirect to dashboard if setup complete

## Usage Flow

### First-Time Admin Setup

1. Admin receives invite email and signs up
2. System checks if profile is complete
3. If incomplete, redirects to `/admin/profile-setup`
4. Admin completes required fields:
   - First name
   - Last name
   - Display name
5. Optional fields:
   - Profile picture
   - Phone number
   - Timezone
   - Bio
6. On save, profile marked as complete
7. Redirects to admin dashboard

### Ongoing Profile Management

1. Admin navigates to "My Profile" in sidebar
2. Access to three tabs:
   - **Profile:** Edit personal information
   - **Security:** Change password
   - **Notifications:** Manage notification preferences
3. Changes saved immediately with feedback
4. Profile picture can be updated/removed anytime

### Password Change Flow

1. Navigate to Security tab
2. Enter current password
3. Enter new password (must meet requirements)
4. Confirm new password
5. System verifies current password
6. Updates password if verification succeeds
7. Shows success/error feedback

## API Reference

### Profile Service Methods

```typescript
// Get admin profile
const profile = await adminProfileService.getProfile(userId);

// Setup initial profile
const profile = await adminProfileService.setupProfile(userId, {
  first_name: 'John',
  last_name: 'Doe',
  display_name: 'John Doe',
  phone: '+1234567890',
  bio: 'Admin bio',
  timezone: 'America/New_York'
});

// Update profile
const profile = await adminProfileService.updateProfile(userId, {
  display_name: 'New Name',
  notification_preferences: {
    email: true,
    push: false,
    chat: true
  }
});

// Upload profile picture
const url = await adminProfileService.uploadProfilePicture(userId, file);

// Delete profile picture
await adminProfileService.deleteProfilePicture(userId);

// Change password
await adminProfileService.changePassword(currentPassword, newPassword);

// Check profile completion
const isComplete = await adminProfileService.checkProfileCompletion(userId);
```

## Database Queries

### Get Admin Profile
```sql
SELECT * FROM user_profiles
WHERE user_id = 'user-id' AND is_admin = true;
```

### Update Profile
```sql
UPDATE user_profiles
SET
  first_name = 'John',
  last_name = 'Doe',
  display_name = 'John Doe',
  profile_picture_url = 'https://...',
  updated_at = NOW()
WHERE user_id = 'user-id';
```

### Check Profile Completion
```sql
SELECT profile_completed
FROM user_profiles
WHERE user_id = 'user-id';
```

## Security Considerations

### Data Access
- Admins can only view/edit their own profiles
- Super admins can view all admin profiles
- RLS policies enforce access control

### Password Changes
- Require current password verification
- Rate limited to prevent brute force
- Strong password requirements enforced

### File Uploads
- File size limited to 5MB
- Only image files allowed
- Files stored in user-specific folders
- Public read access, authenticated write access

### Input Validation
- All inputs sanitized to prevent XSS
- Zod schemas for type safety
- Server-side validation as backup
- SQL injection prevention through parameterized queries

## Testing Checklist

- [ ] Profile setup completes successfully
- [ ] Profile picture uploads correctly
- [ ] Profile picture deletes successfully
- [ ] All form fields validate correctly
- [ ] Password change requires current password
- [ ] Strong password requirements enforced
- [ ] Notification preferences save correctly
- [ ] Timezone selection works
- [ ] Character limits enforced (bio, names)
- [ ] Redirect flows work correctly
- [ ] Mobile responsive design works
- [ ] Dark mode displays correctly
- [ ] Error messages display properly
- [ ] Loading states show appropriately
- [ ] RLS policies prevent unauthorized access

## Future Enhancements

Potential improvements:
- Two-factor authentication
- Activity log viewing
- Profile export functionality
- Bulk admin profile management for super admins
- Profile picture cropping/editing tools
- Email change verification flow
- Session management interface
- API key management integration

## File Structure

```
src/
├── components/
│   └── admin/
│       └── ProfilePictureUpload.tsx
├── lib/
│   ├── adminProfileService.ts
│   └── adminProfileValidation.ts
├── pages/
│   └── admin/
│       ├── ProfileSetup.tsx
│       └── ProfileEdit.tsx
└── App.tsx (routes added)

supabase/
├── functions/
│   └── admin-profile-operations/
│       └── index.ts
└── migrations/
    └── [timestamp]_create_admin_profile_management_system.sql
```

## Support

For issues or questions:
1. Check validation error messages
2. Review browser console for errors
3. Verify database RLS policies
4. Check Edge Function logs
5. Ensure proper authentication

## Maintenance

Regular maintenance tasks:
- Monitor storage bucket usage
- Review audit logs periodically
- Update password requirements if needed
- Check rate limiting effectiveness
- Review and update validation rules
