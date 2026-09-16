import { useRef, useState } from 'react';
import { X, CheckCircle2, Upload, FileText, Eye, Plus } from 'lucide-react';

export default function MultiDropZone({ id, label, docIcon, files = [], onFilesChange, error }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f => 
      f.type.startsWith('image/') || f.type === 'application/pdf'
    );
    if (dropped.length > 0) onFilesChange([...files, ...dropped]);
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    if (selected.length > 0) onFilesChange([...files, ...selected]);
    e.target.value = ''; // reset so same files can be selected again if removed
  };

  const handlePreview = (e, file) => {
    e.stopPropagation();
    const url = URL.createObjectURL(file);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const handleRemove = (e, index) => {
    e.stopPropagation();
    const newFiles = [...files];
    newFiles.splice(index, 1);
    onFilesChange(newFiles);
  };

  return (
    <div className="dropzone-wrapper">
      <div className="dropzone-label">
        <span className="dropzone-label-icon">{docIcon}</span>
        <span className="dropzone-label-text">{label}</span>
        {files.length > 0 && <span className="dropzone-check"><CheckCircle2 size={15} /></span>}
      </div>
      
      <div
        className={`dropzone ${dragging ? 'dragging' : ''} ${error && files.length === 0 ? 'has-error' : ''}`}
        onClick={(e) => {
          // Hanya trigger click input jika yang diklik adalah area dropzone, bukan child yang spesifik
          if(e.target === e.currentTarget || e.target.closest('.dropzone-placeholder')) {
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{ padding: files.length > 0 ? '10px' : '14px' }}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="image/*,application/pdf"
          className="hidden-input"
          multiple
          onChange={handleFileChange}
        />
        
        {files.length > 0 ? (
          <div className="multi-file-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {files.map((file, index) => (
              <div key={index} className="file-preview" style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
                <FileText size={20} className="file-icon" />
                <div className="file-info">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
                <button type="button" className="btn-preview" onClick={(e) => handlePreview(e, file)} title="Lihat dokumen">
                  <Eye size={14} />
                </button>
                <button
                  type="button"
                  className="btn-remove"
                  onClick={(e) => handleRemove(e, index)}
                  title="Hapus"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            
            <div 
              className="dropzone-placeholder add-more-placeholder" 
              style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', cursor: 'pointer', display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: '6px' }}
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            >
              <Plus size={16} className="upload-icon" style={{ marginBottom: '0', color: '#3b82f6' }} />
              <span style={{ fontSize: '13px', color: '#3b82f6', fontWeight: '500' }}>Tambah file lain...</span>
            </div>
          </div>
        ) : (
          <div className="dropzone-placeholder">
            <Upload size={20} className="upload-icon" />
            <span>Klik atau seret beberapa file ke sini</span>
            <span className="dropzone-hint">JPG, PNG, atau PDF &bull; Bisa lebih dari satu</span>
          </div>
        )}
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
