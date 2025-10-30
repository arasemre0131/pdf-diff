/**
 * File Validation Service
 * Validates PDF files before upload
 */

import { FILE_CONSTRAINTS } from '../utils/constants';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateFileType(file: File): ValidationResult {
  const isValidType = (FILE_CONSTRAINTS.acceptedMimeTypes as unknown as string[]).includes(file.type);
  const isValidExtension = (FILE_CONSTRAINTS.acceptedExtensions as unknown as string[]).some((ext) =>
    file.name.toLowerCase().endsWith(ext)
  );

  if (!isValidType && !isValidExtension) {
    return { valid: false, error: 'Only PDF files are supported' };
  }

  return { valid: true };
}

export function validateFileSize(file: File): ValidationResult {
  if (file.size > FILE_CONSTRAINTS.maxSizeBytes) {
    return { valid: false, error: 'File exceeds 50MB limit' };
  }

  return { valid: true };
}

export function validateFileCount(files: File[]): ValidationResult {
  if (files.length !== 2) {
    return { valid: false, error: 'Please select exactly 2 PDF files' };
  }

  return { valid: true };
}

export function validateFiles(files: File[]): FileValidationResult {
  const countResult = validateFileCount(files);
  if (!countResult.valid) {
    return { valid: false, errors: [countResult.error!] };
  }

  const errors: string[] = [];
  for (const file of files) {
    const typeResult = validateFileType(file);
    if (!typeResult.valid) {
      errors.push(`${file.name}: ${typeResult.error}`);
    }

    const sizeResult = validateFileSize(file);
    if (!sizeResult.valid) {
      errors.push(`${file.name}: ${sizeResult.error}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function hasDuplicateFiles(files: File[]): boolean {
  const seen = new Set<string>();
  for (const file of files) {
    const key = `${file.name}-${file.size}`;
    if (seen.has(key)) {
      return true;
    }
    seen.add(key);
  }
  return false;
}
