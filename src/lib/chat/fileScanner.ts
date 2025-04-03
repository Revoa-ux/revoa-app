import { ValidationError } from '../errors';

// File types that require scanning
const SCAN_REQUIRED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
  'application/x-zip-compressed'
];

// Maximum file size for scanning (50MB)
const MAX_SCAN_SIZE = 50 * 1024 * 1024;

interface ScanResult {
  safe: boolean;
  threats: string[];
}

export const scanFile = async (file: File): Promise<ScanResult> => {
  // Skip scanning for non-risky file types
  if (!SCAN_REQUIRED_TYPES.includes(file.type)) {
    return { safe: true, threats: [] };
  }

  // Check file size
  if (file.size > MAX_SCAN_SIZE) {
    throw new ValidationError(
      `File too large for scanning. Maximum size is ${MAX_SCAN_SIZE / (1024 * 1024)}MB`,
      'file'
    );
  }

  try {
    // Send file for scanning
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/files/scan', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('File scanning failed');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('File scanning error:', error);
    throw new ValidationError(
      'Unable to scan file for threats. Please try again.',
      'file'
    );
  }
};

// File type validation
export const validateFileType = (file: File): boolean => {
  // List of allowed MIME types
  const ALLOWED_TYPES = [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    
    // Archives
    'application/zip',
    'application/x-zip-compressed'
  ];

  return ALLOWED_TYPES.includes(file.type);
};

// File name sanitization
export const sanitizeFileName = (fileName: string): string => {
  // Remove potentially dangerous characters
  return fileName
    .replace(/[^\w\s.-]/g, '')  // Remove special characters
    .replace(/\s+/g, '_')       // Replace spaces with underscores
    .toLowerCase();             // Convert to lowercase
};

// File metadata extraction
export const extractFileMetadata = async (file: File) => {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    hash: await calculateFileHash(file)
  };
};

// Calculate file hash for integrity checking
const calculateFileHash = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};