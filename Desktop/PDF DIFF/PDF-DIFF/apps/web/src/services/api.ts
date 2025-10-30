import axios from 'axios';
import axiosRetry from 'axios-retry';
import type { UploadSuccessResponse, ComparisonJobStatusResponse } from '../types/api';
import { API_BASE_PATH, POLLING_CONFIG } from '../utils/constants';
const apiClient = axios.create({ baseURL: API_BASE_PATH, timeout: POLLING_CONFIG.timeoutMs, headers: { 'Content-Type': 'application/json', }, });
axiosRetry(apiClient, { retries: 3, retryDelay: axiosRetry.exponentialDelay, retryCondition: (error) => axiosRetry.isNetworkOrIdempotentRequestError(error), });
export async function uploadPDFs(file1: File, file2: File): Promise<UploadSuccessResponse> {
  const formData = new FormData();
  formData.append('file1', file1);
  formData.append('file2', file2);
  const response = await apiClient.post<UploadSuccessResponse>('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data', }, });
  return response.data;
}
export async function getJobStatus(jobId: string): Promise<ComparisonJobStatusResponse> {
  const response = await apiClient.get<ComparisonJobStatusResponse>(`/jobs/${jobId}`);
  return response.data;
}
export default apiClient;
