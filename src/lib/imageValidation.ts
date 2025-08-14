/**
 * Validates if a file is a valid image format including .webp
 * @param file - The file to validate
 * @returns boolean - True if valid image format
 */
export const isValidImageFile = (file: File): boolean => {
  const validTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  return validTypes.includes(file.type);
};

/**
 * Gets the file extension from a filename
 * @param filename - The filename to extract extension from
 * @returns string - The file extension
 */
export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

/**
 * Validates file size
 * @param file - The file to validate
 * @param maxSizeInMB - Maximum size in megabytes
 * @returns boolean - True if file size is valid
 */
export const isValidFileSize = (file: File, maxSizeInMB: number): boolean => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
};