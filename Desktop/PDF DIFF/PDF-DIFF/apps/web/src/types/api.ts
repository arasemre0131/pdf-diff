export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export interface UploadSuccessResponse { job_id: string; status: JobStatus; created_at: string; }
export interface DifferenceLocation { x: number; y: number; width: number; height: number; }
export interface Difference { id: string; type: 'addition' | 'deletion' | 'modification'; location: DifferenceLocation; content?: string; confidence?: number; }
export interface ComparisonResultData { total_differences: number; pages_affected: number; differences_by_page: { [pageNumber: number]: { page_number: number; additions: Difference[]; deletions: Difference[]; modifications: Difference[]; total_on_page: number; }; }; generated_at: string; }
export interface ComparisonJobStatusResponse { job_id: string; status: JobStatus; created_at: string; updated_at: string; result?: ComparisonResultData; error_message?: string; }
export interface ErrorResponse { error: string; message: string; details?: Record<string, any>; timestamp?: string; }
