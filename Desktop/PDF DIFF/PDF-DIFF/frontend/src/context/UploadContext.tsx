/**
 * Upload Context
 * Manages file upload state and operations
 */

import React, { createContext, useReducer, ReactNode, useCallback } from 'react';
import { uploadFiles, cancelUpload } from '../services/uploadManager';
import { saveUploadState, clearUploadState } from '../utils/storage';

export interface UploadContextType {
  selectedFiles: File[];
  uploadProgress: number;
  isUploading: boolean;
  error?: string;
  selectFiles: (files: File[]) => void;
  removeFile: (index: number) => void;
  clearAllFiles: () => void;
  submitUpload: (files: File[]) => Promise<string>;
  cancelUpload: () => void;
}

interface UploadState {
  selectedFiles: File[];
  uploadProgress: number;
  isUploading: boolean;
  error?: string;
}

type UploadAction =
  | { type: 'SELECT_FILES'; payload: File[] }
  | { type: 'REMOVE_FILE'; payload: number }
  | { type: 'CLEAR_ALL' }
  | { type: 'START_UPLOAD' }
  | { type: 'UPDATE_PROGRESS'; payload: number }
  | { type: 'UPLOAD_COMPLETE' }
  | { type: 'UPLOAD_ERROR'; payload: string }
  | { type: 'CANCEL_UPLOAD' };

const initialState: UploadState = {
  selectedFiles: [],
  uploadProgress: 0,
  isUploading: false,
};

function uploadReducer(state: UploadState, action: UploadAction): UploadState {
  switch (action.type) {
    case 'SELECT_FILES':
      return {
        ...state,
        selectedFiles: action.payload,
        error: undefined,
      };
    case 'REMOVE_FILE': {
      const newFiles = state.selectedFiles.filter((_, index) => index !== action.payload);
      return {
        ...state,
        selectedFiles: newFiles,
      };
    }
    case 'CLEAR_ALL':
      return {
        ...state,
        selectedFiles: [],
        uploadProgress: 0,
      };
    case 'START_UPLOAD':
      return {
        ...state,
        isUploading: true,
        uploadProgress: 0,
        error: undefined,
      };
    case 'UPDATE_PROGRESS':
      return {
        ...state,
        uploadProgress: action.payload,
      };
    case 'UPLOAD_COMPLETE':
      return {
        ...state,
        isUploading: false,
        uploadProgress: 100,
        selectedFiles: [],
      };
    case 'UPLOAD_ERROR':
      return {
        ...state,
        isUploading: false,
        error: action.payload,
      };
    case 'CANCEL_UPLOAD':
      return {
        ...state,
        isUploading: false,
        uploadProgress: 0,
        error: 'Upload cancelled by user',
      };
    default:
      return state;
  }
}

export const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(uploadReducer, initialState);

  const selectFiles = useCallback((files: File[]) => {
    dispatch({ type: 'SELECT_FILES', payload: files });
    const fileNames = files.map((f) => f.name);
    const fileSizes = files.map((f) => f.size);
    saveUploadState(fileNames, fileSizes);
  }, []);

  const removeFile = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_FILE', payload: index });
  }, []);

  const clearAllFiles = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
    clearUploadState();
  }, []);

  const submitUpload = useCallback(async (files: File[]): Promise<string> => {
    dispatch({ type: 'START_UPLOAD' });

    try {
      const jobId = await uploadFiles(files[0], files[1], {
        onProgress: (progress: number) => {
          dispatch({ type: 'UPDATE_PROGRESS', payload: progress });
        },
        onComplete: (jobId: string) => {
          dispatch({ type: 'UPLOAD_COMPLETE' });
          clearUploadState();
        },
        onError: (error: Error) => {
          dispatch({ type: 'UPLOAD_ERROR', payload: error.message });
        },
      });

      return jobId;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      dispatch({ type: 'UPLOAD_ERROR', payload: message });
      throw error;
    }
  }, []);

  const handleCancelUpload = useCallback(() => {
    cancelUpload();
    dispatch({ type: 'CANCEL_UPLOAD' });
  }, []);

  return (
    <UploadContext.Provider
      value={{
        selectedFiles: state.selectedFiles,
        uploadProgress: state.uploadProgress,
        isUploading: state.isUploading,
        error: state.error,
        selectFiles,
        removeFile,
        clearAllFiles,
        submitUpload,
        cancelUpload: handleCancelUpload,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
}
