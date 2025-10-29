import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PDFViewer } from '../components/PDFViewer';
import { PageNavigation } from '../components/PageNavigation';
import { useJobPolling } from '../hooks/useJobPolling';
import { Spinner } from '../components/Spinner';
import { ErrorMessage } from '../components/ErrorMessage';

export function ResultsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { job, result, isPolling, pollError, loadJobFromUrl } = useJobPolling();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) {
      navigate('/');
      return;
    }

    const loadJob = async () => {
      try {
        setLoading(true);
        await loadJobFromUrl(jobId);
      } catch (error) {
        console.error('Failed to load job:', error);
      } finally {
        setLoading(false);
      }
    };

    loadJob();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (pollError) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <ErrorMessage 
            message={pollError}
            onRetry={() => jobId && loadJobFromUrl(jobId)}
          />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <ErrorMessage message="Job not found" />
        </div>
      </div>
    );
  }

  if (isPolling) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Spinner />
          <p className="mt-4 text-gray-600">Processing your files...</p>
        </div>
      </div>
    );
  }

  if (job.status === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <ErrorMessage 
            message={job.errorMessage || 'Comparison failed. Please try again.'}
            onRetry={() => navigate('/')}
            retryLabel="Upload New Files"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">PDF Comparison Results</h1>
              <p className="text-gray-600 mt-1">
                Total differences found: {result?.totalDifferences || 0}
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Compare New Files
            </button>
          </div>
        </div>

        <div className="p-6">
          {result && (
            <PDFViewer result={result} jobId={jobId} />
          )}
        </div>

        {result && (
          <div className="bg-white border-t border-gray-200 p-6">
            <PageNavigation totalPages={result.pagesAffected} />
          </div>
        )}
      </div>
    </div>
  );
}
