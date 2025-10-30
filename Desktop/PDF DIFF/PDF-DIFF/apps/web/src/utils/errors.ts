export class AppError extends Error {
  constructor(public code: string, message: string, public statusCode?: number, public originalError?: unknown) {
    super(message);
    this.name = 'AppError';
  }
}
export function handleApiError(error: unknown): AppError {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as any;
    const status = axiosError.response?.status;
    const data = axiosError.response?.data;
    if (!axiosError.response) return new AppError('NETWORK_ERROR', 'Network error', undefined, error);
    return new AppError(data?.error || 'ERROR', data?.message || 'An error occurred', status, error);
  }
  if (error instanceof Error) return new AppError('ERROR', error.message, undefined, error);
  return new AppError('UNKNOWN_ERROR', 'An unexpected error occurred', undefined, error);
}
export function getUserMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}
