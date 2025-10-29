interface UploadFormState { fileNames: string[]; fileSizes: number[]; timestamp: number; }
const UPLOAD_STATE_KEY = 'pdf-comparison:upload-state';
const LAST_JOB_ID_KEY = 'pdf-comparison:last-job-id';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000;
export function saveUploadState(fileNames: string[], fileSizes: number[]): void {
  try {
    const state: UploadFormState = { fileNames, fileSizes, timestamp: Date.now() };
    localStorage.setItem(UPLOAD_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save upload state:', e);
  }
}
export function loadUploadState(): { fileNames: string[]; fileSizes: number[] } | null {
  try {
    const stored = localStorage.getItem(UPLOAD_STATE_KEY);
    if (!stored) return null;
    const state: UploadFormState = JSON.parse(stored);
    if (Date.now() - state.timestamp > CACHE_EXPIRY_MS) {
      clearUploadState();
      return null;
    }
    return { fileNames: state.fileNames, fileSizes: state.fileSizes };
  } catch (e) {
    return null;
  }
}
export function clearUploadState(): void { try { localStorage.removeItem(UPLOAD_STATE_KEY); } catch (e) {} }
export function saveLastJobId(jobId: string): void { try { localStorage.setItem(LAST_JOB_ID_KEY, jobId); } catch (e) {} }
export function getLastJobId(): string | null { try { return localStorage.getItem(LAST_JOB_ID_KEY); } catch (e) { return null; } }
