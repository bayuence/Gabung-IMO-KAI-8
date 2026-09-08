import { useRef, useState } from 'react';
import { X, CheckCircle2, Upload, FileText, Eye } from 'lucide-react';

export default function DropZone({ id, label, docIcon, file, onFileChange, error }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFileChange(dropped);
  };

  const handlePreview = (e) => {
    e.stopPropagation();
    const url = URL.createObjectURL(file);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  return (
    <div className="dropzone-wrapper">
      <div className="dropzone-label">
        <span className="dropzone-label-icon">{docIcon}</span>
        <span className="dropzone-label-text">{label}</span>
        {file && <span className="dropzone-check"><CheckCircle2 size={15} /></span>}
      </div>
      <div
        className={`dropzone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''} ${error ? 'has-error' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="image/*,application/pdf"
          className="hidden-input"
          onChange={(e) => onFileChange(e.target.files[0])}
        />
        {file ? (
          <div className="file-preview">
            <FileText size={20} className="file-icon" />
            <div className="file-info">
              <span className="file-name">{file.name}</span>
              <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
            </div>
            <button type="button" className="btn-preview" onClick={handlePreview} title="Lihat dokumen">
              <Eye size={14} />
            </button>
            <button
              type="button"
              className="btn-remove"
              onClick={(e) => { e.stopPropagation(); onFileChange(null); }}
              title="Hapus"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="dropzone-placeholder">
            <Upload size={20} className="upload-icon" />
            <span>Klik atau seret file ke sini</span>
            <span className="dropzone-hint">JPG, PNG, atau PDF &bull; Maks. 5 MB</span>
          </div>
        )}
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
