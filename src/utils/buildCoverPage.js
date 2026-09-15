import { rgb, StandardFonts } from 'pdf-lib';

/**
 * Halaman sampul Laporan IO
 * Layout: KOP (logo + judul) → BIODATA → GAMBAR SMARTCARD
 * Ukuran halaman menyesuaikan gambar smartcard yang diunggah.
 * Jika tidak ada gambar, default A4 Landscape.
 */
export async function buildCoverPage(
  pdfDoc, nama, nipp, logoUrl,
  jabatan = '', periode = '', tmtJabatan = '', tmtPensiun = '',
  smartcardImageBytes = null,
) {
  const bold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const BLUE   = rgb(0.137, 0.169, 0.365);
  const ORANGE = rgb(0.949, 0.396, 0.133);
  const BLACK  = rgb(0,    0,    0);
  const WHITE  = rgb(1,    1,    1);
  const DGRAY  = rgb(0.2,  0.2,  0.2);
  const LGRAY  = rgb(0.6,  0.6,  0.6);

  // Embed gambar smartcard lebih dulu untuk tahu dimensinya
  let scImg   = null;
  let scRatio = 1;
  if (smartcardImageBytes) {
    try {
      try { scImg = await pdfDoc.embedPng(smartcardImageBytes); }
      catch { scImg = await pdfDoc.embedJpg(smartcardImageBytes); }
      scRatio = scImg.width / scImg.height;
    } catch (e) {
      console.warn('Gagal embed smartcard:', e);
      scImg = null;
    }
  }

  // Ukuran halaman (A4 Portrait)
  const PW = 595;
  const PH = 842;
  const MARGIN = 30;
  const HEADER_H = 80;
  const ROW_GAP = 26;
  const BIO_H = 50 + 5 * ROW_GAP + 20;
  const SC_GAP = 50;

  const HEADER_Y = PH - MARGIN - HEADER_H;
  const TMT_PENS_Y = HEADER_Y - 2 - 50 - 5 * ROW_GAP;

  let SC_DRAW_W = 0;
  let SC_DRAW_H = 0;

  if (scImg) {
    const maxW = PW - MARGIN * 2;
    const maxH = TMT_PENS_Y - MARGIN - SC_GAP;
    const scale = Math.min(maxW / scImg.width, maxH / scImg.height, 1);
    SC_DRAW_W = scImg.width * scale;
    SC_DRAW_H = scImg.height * scale;
  }

  const page = pdfDoc.addPage([PW, PH]);

  // Background putih
  page.drawRectangle({ x: 0, y: 0, width: PW, height: PH, color: WHITE });

  // Area header (sudah dihitung di atas)

  // Garis oranye bawah header
  page.drawRectangle({ x: MARGIN, y: HEADER_Y, width: PW - MARGIN * 2, height: 2, color: ORANGE });

  // Logo KAI
  const LOGO_X     = MARGIN + 15;
  const LOGO_Y     = HEADER_Y + 8;
  const LOGO_MAX_W = 130;
  const LOGO_MAX_H = HEADER_H - 16;
  try {
    const resp  = await fetch(logoUrl);
    const buf   = await resp.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let img;
    try { img = await pdfDoc.embedPng(bytes); }
    catch { img = await pdfDoc.embedJpg(bytes); }
    const { width: lw, height: lh } = img;
    const ratio = Math.min(LOGO_MAX_W / lw, LOGO_MAX_H / lh);
    page.drawImage(img, {
      x: LOGO_X + (LOGO_MAX_W - lw * ratio) / 2,
      y: LOGO_Y + (LOGO_MAX_H - lh * ratio) / 2,
      width: lw * ratio, height: lh * ratio,
    });
  } catch {
    page.drawText('KAI', { x: LOGO_X + 20, y: LOGO_Y + 30, font: bold, size: 32, color: BLUE });
  }

  // Garis vertikal oranye
  const SEP_X = LOGO_X + LOGO_MAX_W + 12;
  page.drawRectangle({ x: SEP_X, y: HEADER_Y + 10, width: 1.5, height: HEADER_H - 20, color: ORANGE });

  // Judul
  const TX      = SEP_X + 18;
  const TITLE_Y = HEADER_Y + (HEADER_H / 2) + 10;
  page.drawText('LAPORAN KEGIATAN PENGOPERASIAN PRASARANA (IO)', {
    x: TX, y: TITLE_Y, font: bold, size: 12, color: BLACK,
  });
  page.drawText('PT Kereta Api Indonesia (Persero)', {
    x: TX, y: TITLE_Y - 18, font: regular, size: 8.5, color: LGRAY,
  });

  // BIODATA
  const LX          = MARGIN + 20;
  const CX          = LX + 110;
  const VX          = CX + 13;
  const NAMA_Y      = HEADER_Y - 2 - 50;
  const NIPP_Y      = NAMA_Y      - ROW_GAP;
  const JABATAN_Y   = NIPP_Y      - ROW_GAP;
  const PERIODE_Y   = JABATAN_Y   - ROW_GAP;
  const TMT_JAB_Y   = PERIODE_Y   - ROW_GAP;
  // TMT_PENS_Y sudah dideklarasikan di atas

  [
    { label: 'NAMA',        value: nama,       y: NAMA_Y      },
    { label: 'NIPP',        value: nipp,       y: NIPP_Y      },
    { label: 'JABATAN',     value: jabatan,    y: JABATAN_Y   },
    { label: 'PERIODE',     value: periode,    y: PERIODE_Y   },
    { label: 'TMT JABATAN', value: tmtJabatan, y: TMT_JAB_Y   },
    { label: 'TMT PENSIUN', value: tmtPensiun, y: TMT_PENS_Y  },
  ].forEach(({ label, value, y }) => {
    page.drawText(label, { x: LX, y, font: bold,    size: 10, color: BLUE  });
    page.drawText(':',   { x: CX, y, font: bold,    size: 10, color: BLUE  });
    page.drawText(value, { x: VX, y, font: regular, size: 10, color: DGRAY });
  });

  // GAMBAR SMARTCARD di bawah biodata (posisi tengah horizontal)
  if (scImg) {
    page.drawImage(scImg, {
      x:      MARGIN + (PW - MARGIN * 2 - SC_DRAW_W) / 2,
      y:      TMT_PENS_Y - SC_GAP - SC_DRAW_H,
      width:  SC_DRAW_W,
      height: SC_DRAW_H,
    });
  }
}
