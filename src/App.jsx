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

  // Konstanta pilihan dropdown
  const JABATAN_OPTIONS = ['DALOPKA', 'PPKP', 'PPKA', 'PAP', 'PLR', 'PRS', 'PJL'];
  const BULAN_OPTIONS   = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const STASIUN_OPTIONS = [
    'BABAT', 'BANGIL', 'BENOWO', 'BENTENG', 'BLIMBING',
    'BOHARAN', 'BOJONEGORO', 'BOWERNO', 'CERME', 'DUDUK',
    'GEDANGAN', 'GEMBONG', 'INDRO', 'KALIMAS', 'KALITIDU',
    'KANDANGAN', 'KAPAS', 'KEDINDING', 'KEPANJEN', 'KESAMBEN',
    'KRIAN', 'LAMONGAN', 'LAWANG', 'MALANG', 'MALANGKOTALAMA',
    'MOJOKERTO', 'NGEBRUK', 'PAKISAJI', 'POGAJIH', 'PORONG',
    'PUCUK', 'SEPANJANG', 'SENGON', 'SIDOARJO', 'SIDOTOPO',
    'SINGOSARI', 'SUKOREJO', 'SURABAYA PASARTURI', 'SURABAYAGUBENG', 'SURABAYAKOTA',
    'SURABAYAN', 'SUMBERREJO', 'SUMBERPUCUNG', 'TANDES', 'TANGGULANGIN',
    'TARIK', 'TOBO', 'TULANGAN', 'WARU', 'WLINGI',
    'WONOKERTO', 'WONOKROMO',
  ];

  const [identity,       setIdentity]       = useState({ nama: '', nipp: '', jabatan: '', bulan: '', tahun: '', stasiun: '' });
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
    if (!identity.nama.trim())    iErrors.nama    = 'Nama wajib diisi.';
    if (!identity.nipp.trim())    iErrors.nipp    = 'NIPP wajib diisi.';
    if (!identity.jabatan)        iErrors.jabatan = 'Jabatan wajib dipilih.';
    if (!identity.bulan)          iErrors.bulan   = 'Bulan wajib dipilih.';
    if (!identity.tahun)                              iErrors.tahun   = 'Tahun wajib diisi.';
    else if (!/^\d{4}$/.test(identity.tahun.toString())) iErrors.tahun = 'Tahun harus 4 digit angka.';
    if (!identity.stasiun)        iErrors.stasiun = 'Nama stasiun wajib dipilih.';
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
      const namaUpper    = identity.nama.trim().toUpperCase();
      const nippUpper    = identity.nipp.trim().toUpperCase();
      const jabatanUpper = identity.jabatan.toUpperCase();
      const periodeStr   = `${identity.bulan} ${identity.tahun}`;
      const stasiunUpper = identity.stasiun.toUpperCase();

      // 1. Halaman sampul
      setProgress('Membuat halaman sampul...');
      await buildCoverPage(mergedPdf, namaUpper, nippUpper, logoUrl, jabatanUpper, periodeStr, stasiunUpper);

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
      const sanitize = (str) => str.trim().replace(/[<>:"/\\|?*]/g, '');
      const filename = `${sanitize(namaUpper)} ${sanitize(nippUpper)} ${sanitize(jabatanUpper)} ${sanitize(identity.bulan)} ${sanitize(identity.tahun)} ${sanitize(stasiunUpper)}.pdf`;

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
    setIdentity({ nama: '', nipp: '', jabatan: '', bulan: '', tahun: '', stasiun: '' });
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
            <h1 className="header-title">IMO Help Desk</h1>
            <p className="header-sub">Unit Operasi Daop 8 Surabaya</p>
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
                <p className="section-desc">Isi data identitas Anda dengan benar.</p>

                {/* Nama & NIPP */}
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

                {/* Jabatan */}
                <div className="field-group">
                  <label htmlFor="selectJabatan" className="field-label">Jabatan</label>
                  <select
                    id="selectJabatan"
                    className={`field-input field-select ${identityErrors.jabatan ? 'has-error' : ''}`}
                    value={identity.jabatan}
                    onChange={(e) => handleIdentityChange('jabatan', e.target.value)}
                  >
                    <option value="">-- Pilih Jabatan --</option>
                    {JABATAN_OPTIONS.map((j) => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </select>
                  {identityErrors.jabatan && <p className="field-error">{identityErrors.jabatan}</p>}
                </div>

                {/* Bulan & Tahun */}
                <div className="identity-row">
                  <div className="field-group">
                    <label htmlFor="selectBulan" className="field-label">Bulan</label>
                    <select
                      id="selectBulan"
                      className={`field-input field-select ${identityErrors.bulan ? 'has-error' : ''}`}
                      value={identity.bulan}
                      onChange={(e) => handleIdentityChange('bulan', e.target.value)}
                    >
                      <option value="">-- Pilih Bulan --</option>
                      {BULAN_OPTIONS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    {identityErrors.bulan && <p className="field-error">{identityErrors.bulan}</p>}
                  </div>

                  <div className="field-group">
                    <label htmlFor="inputTahun" className="field-label">Tahun</label>
                    <input
                      id="inputTahun"
                      type="number"
                      inputMode="numeric"
                      className={`field-input ${identityErrors.tahun ? 'has-error' : ''}`}
                      placeholder="Contoh: 2025"
                      value={identity.tahun}
                      onChange={(e) => handleIdentityChange('tahun', e.target.value)}
                      autoComplete="off"
                      min="2000"
                    />
                    {identityErrors.tahun && <p className="field-error">{identityErrors.tahun}</p>}
                  </div>
                </div>

                {/* Nama Stasiun */}
                <div className="field-group">
                  <label htmlFor="selectStasiun" className="field-label">Nama Stasiun</label>
                  <select
                    id="selectStasiun"
                    className={`field-input field-select ${identityErrors.stasiun ? 'has-error' : ''}`}
                    value={identity.stasiun}
                    onChange={(e) => handleIdentityChange('stasiun', e.target.value)}
                  >
                    <option value="">-- Pilih Stasiun --</option>
                    {STASIUN_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {identityErrors.stasiun && <p className="field-error">{identityErrors.stasiun}</p>}
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
                    label="Smartcard"
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

              {/* Banner Butuh Bantuan */}
              <a
                href="https://wa.me/6282131309313"
                target="_blank"
                rel="noopener noreferrer"
                className="wa-banner"
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
                  alt="WhatsApp"
                  className="wa-banner-logo"
                />
                <div className="wa-banner-text">
                  <span className="wa-banner-title">Butuh Bantuan?</span>
                  <span className="wa-banner-sub">Klik untuk chat via WhatsApp</span>
                </div>
                <span className="wa-banner-arrow">›</span>
              </a>


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
              <span className="result-doc-item"><CreditCard size={12} /> Smartcard</span>
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
