import { rgb, StandardFonts } from 'pdf-lib';

/**
 * Halaman sampul Laporan IO — A4 Landscape
 * Layout header: logo KAI (kiri) | garis oranye vertikal | judul 1 baris (kanan)
 */
export async function buildCoverPage(pdfDoc, nama, nipp, logoUrl) {
  const PW = 842;
  const PH = 595;
  const page = pdfDoc.addPage([PW, PH]);

  const bold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const BLUE   = rgb(0.137, 0.169, 0.365); // #232b5d
  const ORANGE = rgb(0.949, 0.396, 0.133); // #f26522
  const BLACK  = rgb(0,    0,    0);
  const WHITE  = rgb(1,    1,    1);
  const DGRAY  = rgb(0.2,  0.2,  0.2);
  const NGRAY  = rgb(0.35, 0.35, 0.35);
  const LGRAY  = rgb(0.6,  0.6,  0.6);

  // ── Background putih ──────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width: PW, height: PH, color: WHITE });

  // ── Border luar biru ──────────────────────────────────────────────────────
  // Hanya border (isi transparan tidak bisa, jadi kita pakai WHITE agar tidak menimpa)
  page.drawRectangle({
    x: 15, y: 15, width: PW - 30, height: PH - 30,
    borderColor: BLUE, borderWidth: 1.5, color: WHITE,
  });

  // ── Tinggi area header: 100pt ─────────────────────────────────────────────
  const HEADER_H  = 100;               // tinggi area header
  const HEADER_Y  = PH - 15 - HEADER_H; // y bawah area header = 480
  // Garis oranye bawah header (tebal 2pt)
  page.drawRectangle({ x: 15, y: HEADER_Y, width: PW - 30, height: 2, color: ORANGE });

  // ── Logo KAI di kiri (center vertikal di area header) ────────────────────
  const LOGO_X     = 30;
  const LOGO_Y     = HEADER_Y + 8;      // sedikit di atas garis oranye
  const LOGO_MAX_W = 130;
  const LOGO_MAX_H = HEADER_H - 16;     // 84pt tinggi maks logo

  try {
    const resp  = await fetch(logoUrl);
    const buf   = await resp.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let img;
    try { img = await pdfDoc.embedPng(bytes); }
    catch { img = await pdfDoc.embedJpg(bytes); }
    const { width: lw, height: lh } = img;
    const ratio = Math.min(LOGO_MAX_W / lw, LOGO_MAX_H / lh);
    const lW = lw * ratio;
    const lH = lh * ratio;
    page.drawImage(img, {
      x: LOGO_X + (LOGO_MAX_W - lW) / 2,
      y: LOGO_Y + (LOGO_MAX_H - lH) / 2,
      width: lW,
      height: lH,
    });
  } catch {
    page.drawText('KAI', {
      x: LOGO_X + 20, y: LOGO_Y + 30,
      font: bold, size: 32, color: BLUE,
    });
  }

  // ── Garis vertikal oranye pemisah logo | judul ────────────────────────────
  const SEP_X = LOGO_X + LOGO_MAX_W + 12;
  page.drawRectangle({
    x: SEP_X, y: HEADER_Y + 10,
    width: 1.5, height: HEADER_H - 20,
    color: ORANGE,
  });

  // ── Judul: SATU baris penuh, warna hitam ─────────────────────────────────
  const TX         = SEP_X + 18;
  const TITLE_TEXT = 'LAPORAN KEGIATAN PENGOPERASIAN PRASARANA (IO)';
  const TITLE_SIZE = 15;
  // Hitung y tengah area header
  const TITLE_Y    = HEADER_Y + (HEADER_H / 2) + 10;
  const SUB_Y      = TITLE_Y - 20;

  page.drawText(TITLE_TEXT, {
    x: TX, y: TITLE_Y,
    font: bold, size: TITLE_SIZE, color: BLACK,
  });
  page.drawText('PT Kereta Api Indonesia (Persero)', {
    x: TX, y: SUB_Y,
    font: regular, size: 8.5, color: LGRAY,
  });

  // ── Identitas ─────────────────────────────────────────────────────────────
  const LX     = 35;   // label x
  const CX     = 120;  // colon x
  const VX     = 133;  // value x
  const NAMA_Y = HEADER_Y - 45;
  const NIPP_Y = NAMA_Y - 28;

  page.drawText('NAMA', { x: LX, y: NAMA_Y, font: bold,    size: 11, color: BLUE  });
  page.drawText(':',    { x: CX, y: NAMA_Y, font: bold,    size: 11, color: BLUE  });
  page.drawText(nama,   { x: VX, y: NAMA_Y, font: regular, size: 11, color: DGRAY });

  page.drawText('NIPP', { x: LX, y: NIPP_Y, font: bold,    size: 11, color: BLUE  });
  page.drawText(':',    { x: CX, y: NIPP_Y, font: bold,    size: 11, color: BLUE  });
  page.drawText(nipp,   { x: VX, y: NIPP_Y, font: regular, size: 11, color: DGRAY });

  // ── PERHATIAN (pojok kiri bawah, font mikro) ──────────────────────────────
  const N_SIZE = 5.5;
  const notes  = [
    'PERHATIAN !!!',
    '* Foto Dokumentasi yang dilampirkan adalah pada saat melaksanakan tugas sesuai tupoksi masing-masing dan bukan foto selfie.',
    '* Foto Dokumentasi cukup satu (tidak perlu banyak atau dikolase) dan harus dilengkapi Timestamp yang bisa dibaca dengan Jelas.',
    '* Foto Serah Terima harus sesuai dengan tanggal dokumentasinya dan bisa dibaca dengan Jelas.',
  ];
  notes.forEach((line, i) => {
    page.drawText(line, {
      x: 18,
      y: 50 - i * (N_SIZE + 2.5),
      font:  i === 0 ? bold    : regular,
      size:  N_SIZE,
      color: i === 0 ? ORANGE  : NGRAY,
    });
  });
}
