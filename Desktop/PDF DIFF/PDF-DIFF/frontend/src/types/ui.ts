import type { UploadedFile, ComparisonResult } from './domain';
export interface FileUploadAreaProps { onFilesSelected: (files: File[]) => void; onError: (error: string) => void; error?: string; loading?: boolean; }
export interface FileListProps { files: UploadedFile[]; onRemove: (fileId: string) => void; onClear: () => void; }
export interface ProgressIndicatorProps { progress: number; total?: number; fileName?: string; status?: 'uploading' | 'complete' | 'error'; error?: string; }
export interface PDFViewerProps { pdfUrl: string; pageNumber: number; zoom: number; differences: any[]; onPageChange?: (pageNum: number) => void; onZoomChange?: (zoom: number) => void; }
export interface PageNavigationProps { currentPage: number; totalPages: number; onPreviousPage: () => void; onNextPage: () => void; onPageChange: (pageNum: number) => void; onNextDifference?: () => void; hasNextDifference?: boolean; }
export interface DifferenceSummaryProps { totalDifferences: number; pagesAffected: number; totalPages?: number; }
export interface ExportButtonProps { result: ComparisonResult; loading?: boolean; onError?: (error: string) => void; }
export interface ErrorBoundaryProps { children: React.ReactNode; fallback?: React.ReactNode; }
