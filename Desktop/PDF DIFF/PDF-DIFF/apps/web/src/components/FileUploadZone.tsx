import { useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Upload, FileText, X } from 'lucide-react';

interface FileUploadZoneProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
  label?: string;
}

export function FileUploadZone({ file, onFileSelect, disabled, label }: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/pdf') {
        onFileSelect(selectedFile);
      } else {
        alert('Lütfen bir PDF dosyası seçin');
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      onFileSelect(droppedFile);
    } else {
      alert('Lütfen bir PDF dosyası sürükleyin');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleRemove = () => {
    onFileSelect(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {!file ? (
        <Card
          className={`border-2 border-dashed transition-all cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => !disabled && inputRef.current?.click()}
        >
          <div className="p-8 text-center">
            <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
            <p className="mb-2 text-slate-700">
              {label || 'Yüklemek için tıklayın veya sürükleyip bırakın'}
            </p>
            <p className="text-slate-500">Sadece PDF dosyaları</p>
          </div>
        </Card>
      ) : (
        <Card className="border-blue-300 bg-blue-50/30">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <FileText className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-slate-900 mb-1">
                  {file.name}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {formatFileSize(file.size)}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    PDF
                  </Badge>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                disabled={disabled}
                className="flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
