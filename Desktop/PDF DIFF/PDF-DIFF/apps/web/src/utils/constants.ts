export const API_BASE_PATH = '/api/v1';
export const FILE_CONSTRAINTS = { maxSizeBytes: 50 * 1024 * 1024, maxSizeMB: 50, acceptedMimeTypes: ['application/pdf'], acceptedExtensions: ['.pdf'], } as const;
export const DIFFERENCE_COLORS = { addition: '#22c55e', deletion: '#ef4444', modification: '#eab308', } as const;
export const POLLING_CONFIG = { initialIntervalMs: 3000, maxIntervalMs: 60000, exponentialBackoffMinutes: [5, 10], maxRetries: 3, timeoutMs: 30000, } as const;
