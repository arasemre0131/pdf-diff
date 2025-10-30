/**
 * Upload Page
 * Main page for uploading and comparing PDF files
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUploadArea } from '../components/FileUploadArea';
import { FileList } from '../components/FileList';
import { ProgressIndicator } from '../components/ProgressIndicator';
import { useFileUpload } from '../hooks/useFileUpload';
import { validateFiles, hasDuplicateFiles } from '../services/fileValidator';

export function UploadPage() {
  const navigate = useNavigate();
  const {
    selectedFiles,
    uploadProgress,
    isUploading,
    error: uploadError,
    selectFiles,
    removeFile,
    clearAllFiles,
    submitUpload,
    cancelUpload,
  } = useFileUpload();

  const [validationError, setValidationError] = useState<string | null>(null);

  const handleFilesSelected = (files: File[]) => {
    setValidationError(null);

    // Validate files
    const validation = validateFiles(files);
    if (!validation.valid) {
      setValidationError(validation.errors[0]);
      return;
    }

    // Check for duplicates
    if (hasDuplicateFiles(files)) {
      setValidationError('Duplicate files detected. Please select different files.');
      return;
    }

    selectFiles(files);
  };

  const handleSubmit = async () => {
    if (selectedFiles.length !== 2) {
      setValidationError('Please select exactly 2 PDF files');
      return;
    }

    try {
      const jobId = await submitUpload(selectedFiles);
      navigate(`/results/${jobId}`);
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const handleRemoveFile = (index: number) => {
    removeFile(index);
    setValidationError(null);
  };

  const handleClearAll = () => {
    clearAllFiles();
    setValidationError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">PDF Comparison Tool</h1>
          <p className="text-xl text-gray-600">
            Upload two PDF files to compare them side-by-side and highlight differences
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Upload Area */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <FileUploadArea 
              onFilesSelected={handleFilesSelected}
              disabled={isUploading}
            />
          </div>

          {/* Error Messages */}
          {(validationError || uploadError) && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
              <p className="text-red-700 font-semibold">
                {validationError || uploadError}
              </p>
            </div>
          )}

          {/* File List */}
          {selectedFiles.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <FileList
                files={selectedFiles}
                onRemoveFile={handleRemoveFile}
                onClearAll={handleClearAll}
                disabled={isUploading}
              />
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <ProgressIndicator
                progress={uploadProgress}
                onCancel={cancelUpload}
              />
            </div>
          )}

          {/* Submit Button */}
          {selectedFiles.length === 2 && !isUploading && (
            <div className="flex justify-center gap-4">
              <button
                onClick={handleSubmit}
                className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Compare PDFs
              </button>
              <button
                onClick={handleClearAll}
                className="px-8 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Clear
              </button>
            </div>
          )}

          {selectedFiles.length === 1 && !isUploading && (
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-blue-700 font-semibold">
                Please select one more PDF file to compare
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
