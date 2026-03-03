import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { FileText, Upload, Trash2, Loader2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export const Documents = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [isLoadingProps, setIsLoadingProps] = useState(true);
  
  // Upload states
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setIsLoadingProps(true);
      const res = await api.get('/documents');
      setDocuments(res.data);
      setError(null);
    } catch (err) {
      console.error('Failed to load documents:', err);
      setError('Failed to load documents. Make sure the server is running.');
    } finally {
      setIsLoadingProps(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        setError('Only PDF files are supported currently.');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    setIsUploading(true);
    setUploadProgress('Uploading and processing...');
    setError(null);

    try {
      const res = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setUploadProgress(`Success! Processed ${res.data.data.chunks_processed || 'all'} chunks.`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Refresh list
      fetchDocuments();
      
      // Clear success message after 3 seconds
      setTimeout(() => setUploadProgress(''), 3000);
    } catch (err) {
      console.error('Upload failed:', err);
      // Fast API 422 errors detail is often an array or object, which crashes React
      const detail = err.response?.data?.detail;
      let errorMsg = 'Failed to upload document.';
      if (typeof detail === 'string') {
        errorMsg = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
         errorMsg = detail[0].msg || JSON.stringify(detail);
      } else if (typeof detail === 'object' && detail !== null) {
         errorMsg = JSON.stringify(detail);
      }
      setError(errorMsg);
      setUploadProgress('');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document? This will also remove its indexed chunks.')) {
      return;
    }

    try {
      await api.delete(`/documents/${docId}`);
      setDocuments(documents.filter(d => d.id !== docId));
    } catch (err) {
      console.error('Failed to delete:', err);
      alert('Failed to delete document.');
    }
  };

  return (
    <div className="h-full flex flex-col p-6 max-w-5xl mx-auto w-full gap-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
            Knowledge Base
          </h2>
          <p className="text-sm text-textMuted mt-1">Manage documents that the AI uses for context.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Upload Zone */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center border border-dashed border-border/60 hover:border-primary/50 transition-colors">
        <Upload className="w-10 h-10 text-primary mb-3" />
        <h3 className="font-semibold text-text mb-1">Upload New Document</h3>
        <p className="text-sm text-textMuted mb-4 text-center max-w-sm">
          Select a PDF file to index into the RAG system. The document will be chunked and embedded automatically.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf"
            className="block w-full text-sm text-textMuted
            file:mr-4 file:py-2.5 file:px-4
            file:rounded-xl file:border-0
            file:text-sm file:font-semibold
            file:bg-surfaceHover file:text-text
            hover:file:bg-surfaceHover/80
            border border-border rounded-xl cursor-pointer"
            disabled={isUploading}
          />
          
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="flex-shrink-0 bg-primary hover:bg-primaryHover text-white px-6 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
          >
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Process'}
          </button>
        </div>
        
        {uploadProgress && (
          <p className="text-sm text-green-400 mt-4 font-medium animate-fade-in">{uploadProgress}</p>
        )}
      </div>

      {/* Document List */}
      <div className="flex-1 glass-panel rounded-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border bg-surface/30">
          <h3 className="font-semibold text-text">Indexed Files ({documents.length})</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoadingProps ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12 text-textMuted flex flex-col items-center">
              <FileText className="w-12 h-12 opacity-20 mb-3" />
              <p>No documents uploaded yet in your organization.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <div key={doc.id} className="bg-surface border border-border rounded-xl p-4 flex flex-col group hover:border-primary/30 transition-colors shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="bg-primary/10 p-2.5 rounded-lg text-primary">
                      <FileText className="w-6 h-6" />
                    </div>
                    {user?.role === 'admin' && (
                      <button 
                        onClick={() => handleDelete(doc.id)}
                        className="p-1.5 text-textMuted hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <h4 className="font-semibold text-text truncate mb-1" title={doc.filename}>
                    {doc.filename}
                  </h4>
                  <p className="text-xs text-textMuted mt-auto">
                    Uploaded: {new Date(doc.upload_date).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
