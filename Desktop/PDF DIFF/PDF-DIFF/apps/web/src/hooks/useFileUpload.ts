/**
 * useFileUpload Hook
 * Manages file upload state and functionality
 */

import { useContext } from 'react';
import { UploadContext } from '../context/UploadContext';

export function useFileUpload() {
  const context = useContext(UploadContext);

  if (!context) {
    throw new Error('useFileUpload must be used within an UploadProvider');
  }

  return {
    selectedFiles: context.selectedFiles,
    uploadProgress: context.uploadProgress,
    isUploading: context.isUploading,
    error: context.error,
    selectFiles: context.selectFiles,
    removeFile: context.removeFile,
    clearAllFiles: context.clearAllFiles,
    submitUpload: context.submitUpload,
    cancelUpload: context.cancelUpload,
  };
}
