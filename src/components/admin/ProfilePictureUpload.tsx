import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Camera, Trash2 } from 'lucide-react';
import { toast } from '../../lib/toast';
import Modal from '../Modal';
import { adminProfileService } from '@/lib/adminProfileService';
import { profilePictureSchema } from '@/lib/adminProfileValidation';

interface ProfilePictureUploadProps {
  currentPictureUrl: string | null;
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  onUploadSuccess: (url: string) => void;
  onDeleteSuccess: () => void;
}

export const ProfilePictureUpload: React.FC<ProfilePictureUploadProps> = ({
  currentPictureUrl,
  userId,
  firstName,
  lastName,
  onUploadSuccess,
  onDeleteSuccess,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = profilePictureSchema.safeParse({ file });
    if (!validation.success) {
      const error = validation.error.issues[0].message;
      toast.error(error);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
      setSelectedFile(file);
      setShowPreviewModal(true);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const url = await adminProfileService.uploadProfilePicture(userId, selectedFile);
      toast.success('Profile picture updated successfully');
      onUploadSuccess(url);
      setShowPreviewModal(false);
      setPreviewUrl(null);
      setSelectedFile(null);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await adminProfileService.deleteProfilePicture(userId);
      toast.success('Profile picture removed successfully');
      onDeleteSuccess();
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting profile picture:', error);
      toast.error('Failed to remove profile picture');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelPreview = () => {
    setShowPreviewModal(false);
    setPreviewUrl(null);
    setSelectedFile(null);
  };

  const getInitials = () => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    if (firstName) {
      return firstName.substring(0, 2).toUpperCase();
    }
    if (lastName) {
      return lastName.substring(0, 2).toUpperCase();
    }
    return userId.substring(0, 2).toUpperCase();
  };

  return (
    <>
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-gray-200/80 via-gray-300/70 to-gray-200/60 dark:bg-gradient-to-br dark:from-[#3a3a3a]/50 dark:via-[#4a4a4a]/40 dark:to-[#3a3a3a]/50 flex items-center justify-center">
            {currentPictureUrl ? (
              <img
                src={currentPictureUrl}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-4xl font-semibold text-gray-700 dark:text-gray-200">
                {getInitials()}
              </span>
            )}
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="btn btn-primary absolute bottom-0 right-0 p-2 rounded-full shadow-lg"
          >
            <Camera className="btn-icon" />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="btn btn-secondary"
          >
            <Upload className="btn-icon" />
            Upload New
          </button>

          {currentPictureUrl && (
            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={isDeleting}
              className="btn btn-danger"
            >
              <Trash2 className="btn-icon" />
              Remove
            </button>
          )}
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Max file size: 5MB<br />
          Supported formats: JPEG, PNG, WebP, GIF
        </p>
      </div>

      <Modal
        isOpen={showPreviewModal}
        onClose={handleCancelPreview}
        title="Preview Profile Picture"
      >
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="w-48 h-48 rounded-full overflow-hidden bg-gray-100 dark:bg-dark">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCancelPreview}
              disabled={isUploading}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="btn btn-primary flex-1"
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Remove Profile Picture"
      >
        <div className="space-y-6">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to remove your profile picture? This action cannot be undone.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="btn btn-danger flex-1"
            >
              {isDeleting ? 'Removing...' : 'Remove'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
