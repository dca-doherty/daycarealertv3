import React, { useRef, useState } from 'react';
import { FaUpload, FaTrash, FaFile, FaCheck, FaSpinner } from 'react-icons/fa';
import '../../styles/FileUpload.css';

const FileUpload = ({ files = [], onChange, maxFiles = 3, acceptedFileTypes = ['image/*', 'application/pdf'] }) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      if (files.length + selectedFiles.length > maxFiles) {
        setError(`You can only upload a maximum of ${maxFiles} files.`);
        return;
      }

      setUploading(true);
      setError('');
      
      // Simulate file upload
      setTimeout(() => {
        // In a real implementation, you would upload to a server here
        const newFiles = [...files];
        
        selectedFiles.forEach(file => {
          newFiles.push({
            name: file.name,
            type: file.type,
            size: file.size,
            url: URL.createObjectURL(file),
            status: 'uploaded'
          });
        });
        
        onChange(newFiles);
        setUploading(false);
      }, 1000);
    }
  };

  const handleRemoveFile = (index) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    onChange(newFiles);
    setError('');
  };

  const renderFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) {
      return <FaFile className="file-icon image" />;
    } else if (fileType === 'application/pdf') {
      return <FaFile className="file-icon pdf" />;
    } else {
      return <FaFile className="file-icon" />;
    }
  };

  return (
    <div className="file-upload-container">
      <div className="file-upload-area">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept={acceptedFileTypes.join(',')}
          style={{ display: 'none' }}
        />
        
        {files.length < maxFiles && (
          <button 
            type="button" 
            className="upload-btn" 
            onClick={handleUploadClick}
            disabled={uploading}
          >
            {uploading ? <FaSpinner className="spin" /> : <FaUpload />}
            {uploading ? 'Uploading...' : 'Upload Documents'}
          </button>
        )}
        
        {error && <p className="upload-error">{error}</p>}
        
        <p className="upload-info">
          Accepted file types: Images, PDFs. Max {maxFiles} files.
        </p>
      </div>

      {files.length > 0 && (
        <div className="uploaded-files">
          <h4>Uploaded Documents</h4>
          <ul className="file-list">
            {files.map((file, index) => (
              <li key={index} className="file-item">
                <div className="file-info">
                  {renderFileIcon(file.type)}
                  <span className="file-name">{file.name}</span>
                  {file.status === 'uploaded' && <FaCheck className="status-icon success" />}
                </div>
                <button 
                  type="button" 
                  className="remove-file-btn" 
                  onClick={() => handleRemoveFile(index)}
                >
                  <FaTrash />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileUpload;