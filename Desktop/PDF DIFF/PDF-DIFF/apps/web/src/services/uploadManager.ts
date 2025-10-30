import apiClient from './api';
import type { UploadSuccessResponse } from '../types/api';
let abortController: AbortController | null = null;
export interface UploadProgressCallback { onProgress?: (progress: number) => void; onComplete?: (jobId: string) => void; onError?: (error: Error) => void; }
export async function uploadFiles(file1: File, file2: File, callbacks: UploadProgressCallback): Promise<string> {
  if (abortController) abortController.abort();
  abortController = new AbortController();
  const formData = new FormData();
  formData.append('file1', file1);
  formData.append('file2', file2);
  try {
    const response = await apiClient.post<UploadSuccessResponse>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data', },
      onUploadProgress: (progressEvent: any) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          callbacks.onProgress?.(percentCompleted);
        }
      },
      signal: abortController.signal,
    });
    callbacks.onProgress?.(100);
    callbacks.onComplete?.(response.data.job_id);
    return response.data.job_id;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') error.message = 'Upload cancelled by user';
      callbacks.onError?.(error);
      throw error;
    }
    throw new Error('Unknown upload error');
  }
}
export function cancelUpload(): void { if (abortController) { abortController.abort(); abortController = null; } }
