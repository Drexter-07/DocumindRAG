import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { uploadPDF } from '../api';

const PDFUploader = () => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, uploading, success, error

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      handleUpload(selectedFile);
    } else {
      alert('Please select a valid PDF file.');
    }
  };

  const handleUpload = async (fileToUpload) => {
    setStatus('uploading');
    try {
      await uploadPDF(fileToUpload);
      setStatus('success');
      // Reset after 3 seconds
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  return (
    <div className="p-4 border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-700">Knowledge Base</h2>
        <span className="text-xs text-gray-400">PDF Only</span>
      </div>

      <div className="mt-4">
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {status === 'uploading' ? (
              <Loader2 className="animate-spin text-blue-500 mb-2" size={24} />
            ) : status === 'success' ? (
              <CheckCircle className="text-green-500 mb-2" size={24} />
            ) : status === 'error' ? (
              <AlertCircle className="text-red-500 mb-2" size={24} />
            ) : (
              <Upload className="text-gray-400 mb-2" size={24} />
            )}
            
            <p className="text-sm text-gray-500">
              {status === 'uploading' ? 'Uploading...' : 
               status === 'success' ? 'Done!' : 
               'Click to upload PDF'}
            </p>
          </div>
          <input 
            type="file" 
            className="hidden" 
            accept=".pdf" 
            onChange={handleFileChange} 
            disabled={status === 'uploading'}
          />
        </label>
      </div>
      
      {file && status === 'idle' && (
        <div className="flex items-center gap-2 mt-2 text-sm text-blue-600">
          <FileText size={16} />
          <span className="truncate max-w-[200px]">{file.name}</span>
        </div>
      )}
    </div>
  );
};

export default PDFUploader;