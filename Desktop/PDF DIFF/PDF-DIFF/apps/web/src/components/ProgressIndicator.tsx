/**
 * ProgressIndicator Component
 * Shows upload progress with animated progress bar
 */

interface ProgressIndicatorProps {
  progress: number;
  onCancel?: () => void;
}

export function ProgressIndicator({ progress, onCancel }: ProgressIndicatorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Uploading...</h3>
        <span className="text-2xl font-bold text-blue-600">{progress}%</span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="text-center text-gray-600">
        {progress < 100 && <p>Please wait while we upload your files...</p>}
        {progress === 100 && <p>Upload complete! Processing your files...</p>}
      </div>

      {progress < 100 && onCancel && (
        <div className="flex justify-center">
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Cancel Upload
          </button>
        </div>
      )}
    </div>
  );
}
