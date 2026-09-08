import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import {
  X, CheckCircle2, Upload, Loader2, User, FilePlus2,
  CreditCard, ClipboardCheck, FolderOpen, FolderDown,
  AlertCircle, Download, RefreshCw,
} from 'lucide-react';

import DropZone from './components/DropZone';
import { readFileAsArrayBuffer, imageToPdfPage, downloadBlob } from './utils/pdfHelpers';
import { buildCoverPage } from './utils/buildCoverPage';
import './App.css';

// =============================================
//  KOMPONEN UTAMA: App
// =============================================
function App() {
  const [step,          setStep]          = useState('form'); // 'form' | 'success' | 'error'
  const [loading,       setLoading]       = useState(false);
  const [progress,      setProgress]      = useState('');
  const [errorMsg,      setErrorMsg]      = useState('');
  const [savedBlob,     setSavedBlob]     = useState(null);
  const [submittedName, setSubmittedName] = useState('');
  const [downloadFilename, setDownloadFilename] = useState('');

  const [identity,       setIdentity]       = useState({ nama: '', nipp: '' });
  const [identityErrors, setIdentityErrors] = useState({});

  const [files,      setFiles]      = useState({ smartcard: null, hadir: null, serahTerimaDokumentasi: null });
  const [fileErrors, setFileErrors] = useState({});

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleIdentityChange = (field, value) => {
    setIdentity((prev) => ({ ...prev, [field]: value }));
    if (value.trim()) setIdentityErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleFileChange = (key, file) => {
    setFiles((prev) => ({ ...prev, [key]: file }));
    if (file) setFileErrors((prev) => ({ ...prev, [key]: null }));
  };

  const validate = () => {
    const iErrors = {};
    const fErrors = {};
    if (!identity.nama.trim()) iErrors.nama = 'Nama wajib diisi.';
    if (!identity.nipp.trim()) iErrors.nipp = 'NIPP wajib diisi.';
    if (!files.smartcard)              fErrors.smartcard              = 'Smartcard wajib diunggah.';
    if (!files.hadir)                  fErrors.hadir                  = 'Daftar hadir wajib diunggah.';
    if (!files.serahTerimaDokumentasi) fErrors.serahTerimaDokumentasi = 'Serah Terima & Dokumentasi wajib diunggah.';
    setIdentityErrors(iErrors);
    setFileErrors(fErrors);
    return Object.keys(iErrors).length === 0 && Object.keys(fErrors).length === 0;
  };

  // ── Proses Gabung ─────────────────────────────────────────────────────────
  const handleMerge = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrorMsg('');
    setSavedBlob(null);
    setProgress('Mempersiapkan dokumen...');

    try {
      const mergedPdf = await PDFDocument.create();
      const logoUrl   = window.location.origin + '/logo-kai.png';
      const namaUpper = identity.nama.trim().toUpperCase();
      const nippUpper = identity.nipp.trim().toUpperCase();

      // 1. Halaman sampul
      setProgress('Membuat halaman sampul...');
      await buildCoverPage(mergedPdf, namaUpper, nippUpper, logoUrl);

      // 2. Proses tiap dokumen
      const dokList = [
        { file: files.smartcard,              label: 'Smartcard Dinas' },
        { file: files.hadir,                  label: 'Daftar Hadir' },
        { file: files.serahTerimaDokumentasi, label: 'Serah Terima & Dokumentasi' },
      ];

      for (const { file, label } of dokList) {
        setProgress(`Memproses: ${label}...`);
        if (file.type === 'application/pdf') {
          const buf      = await readFileAsArrayBuffer(file);
          const donorPdf = await PDFDocument.load(buf);
          const pages    = await mergedPdf.copyPages(donorPdf, donorPdf.getPageIndices());
          pages.forEach((p) => mergedPdf.addPage(p));
        } else {
          await imageToPdfPage(mergedPdf, file);
        }
      }

      // 3. Simpan & download
      setProgress('Menyimpan PDF...');
      const pdfBytes = await mergedPdf.save();
      const blob     = new Blob([pdfBytes], { type: 'application/pdf' });
      const filename = `Dokumen_${namaUpper.replace(/\s+/g, '_')}_${nippUpper.replace(/\s+/g, '')}.pdf`;

      setSavedBlob({ blob, filename });
      downloadBlob(blob, filename);

      setSubmittedName(namaUpper);
      setDownloadFilename(filename);
      setStep('success');

    } catch (err) {
      console.error(err);
      setErrorMsg(err?.message || 'Terjadi kesalahan saat memproses dokumen.');
      setStep('error');
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  const handleRedownload = () => {
    if (savedBlob) downloadBlob(savedBlob.blob, savedBlob.filename);
  };

  const handleRetry = () => { setStep('form'); setErrorMsg(''); setSavedBlob(null); };

  const handleReset = () => {
    setStep('form');
    setIdentity({ nama: '', nipp: '' });
    setIdentityErrors({});
    setFiles({ smartcard: null, hadir: null, serahTerimaDokumentasi: null });
    setFileErrors({});
    setSubmittedName('');
    setDownloadFilename('');
    setErrorMsg('');
    setSavedBlob(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="app-shell">

      {/* Header */}
      <header className="app-header">
        <div className="header-logo">
          <img src="/logo-kai.png" alt="Logo KAI" className="header-kai-logo" />
          <div className="header-divider" />
          <div>
            <h1 className="header-title">Gabung IMO</h1>
            <p className="header-sub">Penggabungan Dokumen Pegawai</p>
          </div>
        </div>
      </header>

      <main className="app-main">

        {/* ─── FORM ─── */}
        {step === 'form' && (
          <div className="fade-in">
            <form id="documentForm" onSubmit={handleMerge} noValidate>

              {/* Identitas */}
              <div className="section">
                <div className="section-header">
                  <User size={18} />
                  <span>Identitas Pegawai</span>
                </div>
                <p className="section-desc">Isi nama lengkap dan NIPP Anda dengan benar.</p>

                <div className="identity-row">
                  <div className="field-group">
                    <label htmlFor="inputNama" className="field-label">Nama Lengkap</label>
                    <input
                      id="inputNama"
                      type="text"
                      className={`field-input ${identityErrors.nama ? 'has-error' : ''}`}
                      placeholder="Nama lengkap..."
                      value={identity.nama}
                      onChange={(e) => handleIdentityChange('nama', e.target.value)}
                      autoComplete="off"
                    />
                    {identityErrors.nama && <p className="field-error">{identityErrors.nama}</p>}
                  </div>

                  <div className="field-group">
                    <label htmlFor="inputNipp" className="field-label">NIPP</label>
                    <input
                      id="inputNipp"
                      type="text"
                      inputMode="numeric"
                      className={`field-input ${identityErrors.nipp ? 'has-error' : ''}`}
                      placeholder="NIPP..."
                      value={identity.nipp}
                      onChange={(e) => handleIdentityChange('nipp', e.target.value)}
                      autoComplete="off"
                    />
                    {identityErrors.nipp && <p className="field-error">{identityErrors.nipp}</p>}
                  </div>
                </div>
              </div>

              {/* Upload */}
              <div className="section">
                <div className="section-header">
                  <Upload size={18} />
                  <span>Unggah Dokumen</span>
                </div>
                <p className="section-desc">Ketiga dokumen wajib diunggah sebelum menggabungkan.</p>

                <div className="docs-grid">
                  <DropZone
                    id="fileSmartcard"
                    label="Smartcard Dinas"
                    docIcon={<CreditCard size={15} />}
                    file={files.smartcard}
                    onFileChange={(f) => handleFileChange('smartcard', f)}
                    error={fileErrors.smartcard}
                  />
                  <DropZone
                    id="fileHadir"
                    label="Daftar Hadir"
                    docIcon={<ClipboardCheck size={15} />}
                    file={files.hadir}
                    onFileChange={(f) => handleFileChange('hadir', f)}
                    error={fileErrors.hadir}
                  />
                  <DropZone
                    id="fileSerahTerimaDokumentasi"
                    label="Serah Terima & Dokumentasi"
                    docIcon={<FolderOpen size={15} />}
                    file={files.serahTerimaDokumentasi}
                    onFileChange={(f) => handleFileChange('serahTerimaDokumentasi', f)}
                    error={fileErrors.serahTerimaDokumentasi}
                  />
                </div>
              </div>

              <button type="submit" id="btnGabung" className="btn-submit" disabled={loading}>
                {loading
                  ? <><Loader2 size={18} className="spinning" /> {progress || 'Memproses...'}</>
                  : <><FilePlus2 size={18} /> Gabungkan Dokumen</>
                }
              </button>

            </form>
          </div>
        )}

        {/* ─── SUCCESS ─── */}
        {step === 'success' && (
          <div className="result-container fade-in">
            <div className="result-icon-wrap result-icon--success">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="result-title">Dokumen Berhasil Digabung</h2>
            <p className="result-desc">
              PDF untuk <strong>{submittedName}</strong> telah dibuat dan otomatis terunduh.
            </p>
            <div className="result-file-box">
              <FolderDown size={15} className="result-file-icon" />
              <span className="result-file-name">{downloadFilename}</span>
            </div>
            <div className="result-doc-list">
              <span className="result-doc-item"><CreditCard size={12} /> Smartcard Dinas</span>
              <span className="result-doc-item"><ClipboardCheck size={12} /> Daftar Hadir</span>
              <span className="result-doc-item"><FolderOpen size={12} /> Serah Terima &amp; Dokumentasi</span>
            </div>
            <div className="result-actions">
              <button className="btn-secondary" onClick={handleRedownload}>
                <Download size={15} /> Unduh Ulang
              </button>
              <button className="btn-primary" onClick={handleReset}>
                <RefreshCw size={15} /> Gabungkan Lain
              </button>
            </div>
          </div>
        )}

        {/* ─── ERROR ─── */}
        {step === 'error' && (
          <div className="result-container fade-in">
            <div className="result-icon-wrap result-icon--error">
              <AlertCircle size={32} />
            </div>
            <h2 className="result-title">Gagal Menggabungkan</h2>
            <p className="result-desc">Terjadi kesalahan saat memproses dokumen Anda.</p>
            {errorMsg && (
              <div className="error-detail-box">
                <code>{errorMsg}</code>
              </div>
            )}
            {savedBlob && (
              <div className="result-file-box">
                <FolderDown size={15} className="result-file-icon" />
                <span className="result-file-name">{savedBlob.filename}</span>
              </div>
            )}
            <div className="result-actions">
              {savedBlob && (
                <button className="btn-secondary" onClick={handleRedownload}>
                  <Download size={15} /> Unduh PDF
                </button>
              )}
              <button className="btn-primary" onClick={handleRetry}>
                <RefreshCw size={15} /> Coba Lagi
              </button>
            </div>
          </div>
        )}

      </main>

      <footer className="app-footer">
        <p>© {new Date().getFullYear()} PT Kereta Api Indonesia (Persero)</p>
      </footer>

    </div>
  );
}

export default App;
