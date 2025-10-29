import React, { createContext, useReducer, ReactNode } from 'react';
import type { UploadedFile } from '../types/domain';
import { uploadFiles, cancelUpload } from '../services/uploadManager';
import { saveUploadState, clearUploadState } from '../utils/storage';
import { validateFiles, hasDuplicateFiles } from '../services/fileValidator';

interface UploadContextType {
  files: UploadedFile[];
  isUploading: boolean;
  uploadProgress: number;
  error?: string;
  selectFiles: (fileList: FileList) => void;
  removeFile: (fileId: string) => void;
  clearAllFiles: () => void;
  submitUpload: () => Promise<string>;
  cancelCurrentUpload: () => void;
}

interface UploadState {
  files: UploadedFile[];
  isUploading: boolean;
  uploadProgress: number;
  error?: string;
}

type UploadAction =
  | { type: 'SELECT_FILES'; payload: UploadedFile[] }
  | { type: 'REMOVE_FILE'; payload: string }
  | { type: 'CLEAR_FILES' }
  | { type: 'START_UPLOAD' }
  | { type: 'UPDATE_PROGRESS'; payload: number }
  | { type: 'COMPLETE_UPLOAD' }
  | { type: 'CANCEL_UPLOAD' }
  | { type: 'SET_ERROR'; payload?: string };

const initialState: UploadState = {
  files: [],
  isUploading: false,
  uploadProgress: 0,
};

function uploadReducer(state: UploadState, action: UploadAction): UploadState {
  switch (action.type) {
    case 'SELECT_FILES':
      return { ...state, files: action.payload, error: undefined };
    case 'REMOVE_FILE':
      return { ...state, files: state.files.filter((f) => f.id !== action.payload) };
    case 'CLEAR_FILES':
      return { ...state, files: [], uploadProgress: 0, error: undefined };
    case 'START_UPLOAD':
      return { ...state, isUploading: true, uploadProgress: 0, error: undefined };
    case 'UPDATE_PROGRESS':
      return { ...state, uploadProgress: action.payload };
    case 'COMPLETE_UPLOAD':
      return { ...state, isUploading: false, uploadProgress: 100 };
    case 'CANCEL_UPLOAD':
      return { ...state, isUploading: false, uploadProgress: 0 };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isUploading: false };
    default:
      return state;
  }
}

export const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(uploadReducer, initialState);

  const selectFiles = (fileList: FileList) => {
    const filesArray = Array.from(fileList);
    const validation = validateFiles(filesArray);
    if (!validation.valid) {
      dispatch({ type: 'SET_ERROR', payload: validation.errors[0] });
      return;
    }
    if (hasDuplicateFiles(filesArray)) {
      dispatch({ type: 'SET_ERROR', payload: 'Duplicate files detected' });
      return;
    }
    const uploadedFiles: UploadedFile[] = filesArray.map((file, index) => ({
      id: `${file.name}-${index}`,
      name: file.name,
      size: file.size,
      type: file.type,
      file,
      progress: 0,
    }));
    dispatch({ type: 'SELECT_FILES', payload: uploadedFiles });
    saveUploadState(uploadedFiles.map((f) => f.name), uploadedFiles.map((f) => f.size));
  };

  const removeFile = (fileId: string) => {
    dispatch({ type: 'REMOVE_FILE', payload: fileId });
  };

  const clearAllFiles = () => {
    dispatch({ type: 'CLEAR_FILES' });
    clearUploadState();
  };

  const submitUpload = async (): Promise<string> => {
    if (state.files.length !== 2) {
      dispatch({ type: 'SET_ERROR', payload: 'Please select exactly 2 files' });
      throw new Error('Invalid file count');
    }
    dispatch({ type: 'START_UPLOAD' });
    try {
      const jobId = await uploadFiles(state.files[0].file, state.files[1].file, {
        onProgress: (progress) => {
          dispatch({ type: 'UPDATE_PROGRESS', payload: progress });
        },
      });
      dispatch({ type: 'COMPLETE_UPLOAD' });
      clearUploadState();
      return jobId;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    }
  };

  const cancelCurrentUpload = () => {
    cancelUpload();
    dispatch({ type: 'CANCEL_UPLOAD' });
  };

  return (
    <UploadContext.Provider value={{ files: state.files, isUploading: state.isUploading, uploadProgress: state.uploadProgress, error: state.error, selectFiles, removeFile, clearAllFiles, submitUpload, cancelCurrentUpload }}>
      {children}
    </UploadContext.Provider>
  );
}
