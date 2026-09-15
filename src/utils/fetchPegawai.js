/**
 * Fetch data pegawai berdasarkan NIPP.
 *
 * Mode 1 – Production (DIREKOMENDASIKAN):
 *   Pakai Google Apps Script sebagai proxy API.
 *   Spreadsheet tetap PRIVATE, Apps Script yang punya akses.
 *   Set APPS_SCRIPT_URL dengan URL dari deployment Apps Script.
 *
 * Mode 2 – Development fallback:
 *   Pakai CSV export langsung dari Google Sheets.
 *   Hanya bekerja jika spreadsheet dibagikan publik.
 */

// ── KONFIGURASI ──────────────────────────────────────────────────────────────

/**
 * Paste URL Apps Script kamu di sini setelah deploy.
 * Format: 'https://script.google.com/macros/s/XXXXX.../exec'
 * Biarkan string kosong '' jika belum ada → akan fallback ke CSV.
 */
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzAeiHRXSiyewhNJwDqRUGdTF-XqkW5NVk90uQNLVxIStFZ3PE5hD_DPSVdW3jCC7cWaA/exec';

// Fallback: CSV export langsung (hanya jika spreadsheet publik)
const SHEET_ID  = '1IQHxwImXfmeaeL41-DJ9ww8eaRQej4Jg';
const GID       = '1298790177';
const CSV_URL   = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch & cari pegawai berdasarkan NIPP.
 * Otomatis pilih mode: Apps Script jika URL sudah diset, fallback ke CSV.
 * Returns: { nama, jabatan, stasiun }
 * Throws : Error jika NIPP tidak ditemukan atau gagal fetch.
 */
export async function fetchPegawaiByNipp(nipp) {
  const trimmed = nipp.trim();
  if (!trimmed) throw new Error('NIPP kosong.');

  if (APPS_SCRIPT_URL) {
    return fetchViaAppsScript(trimmed);
  } else {
    return fetchViaCsv(trimmed);
  }
}

// ── Mode 1: Apps Script ───────────────────────────────────────────────────────

const BULAN_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function formatTanggal(dateString) {
  if (!dateString || dateString === '-') return '-';
  const d = new Date(dateString);
  if (isNaN(d)) return dateString;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = BULAN_ID[d.getMonth()];
  const yyyy = d.getFullYear();
  return `${dd} ${mm} ${yyyy}`;
}

async function fetchViaAppsScript(nipp) {
  let res;
  try {
    res = await fetch(`${APPS_SCRIPT_URL}?nipp=${encodeURIComponent(nipp)}`, {
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    throw new Error(`Gagal menghubungi server data. Cek koneksi internet. (${err.message})`);
  }

  const json = await res.json();
  if (!json.found) {
    throw new Error(json.error || `NIPP "${nipp}" tidak ditemukan di data personil.`);
  }
  return {
    nama:        json.nama,
    jabatan:     json.jabatan,
    stasiun:     json.stasiun,
    tmtJabatan:  formatTanggal(json.tmtJabatan),
    tmtPensiun:  formatTanggal(json.tmtPensiun),
  };
}

// ── Mode 2: CSV Export (fallback) ────────────────────────────────────────────

function parseCsvLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

const STOPWORDS = new Set([
  'BESAR', 'KECIL', 'A', 'B', 'C', 'D',
  'UPT', 'UNIT', 'PELAYANAN', 'TERPADU',
]);

function extractStasiun(jabatan = '') {
  const upper = jabatan.toUpperCase();
  const idx = upper.indexOf('STASIUN');
  if (idx === -1) return '';
  const after = upper.slice(idx + 7).trim().split(/\s+/);
  const words = after.filter((w) => w.length > 1 && !STOPWORDS.has(w));
  return words.slice(0, 2).join(' ');
}

async function fetchViaCsv(nipp) {
  let text;
  try {
    const res = await fetch(CSV_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    text = await res.text();
  } catch (err) {
    throw new Error(
      `Gagal mengambil data dari spreadsheet. Pastikan koneksi internet aktif dan spreadsheet dapat diakses publik. (${err.message})`
    );
  }

  const lines = text.split('\n').filter((l) => l.trim());
  for (let i = 1; i < lines.length; i++) {
    const cols     = parseCsvLine(lines[i]);
    const nippCell = (cols[1] || '').trim(); // Kolom B = NIPP
    if (nippCell === nipp) {
      const nama    = (cols[2] || '').trim(); // Kolom C = NAMA
      const jabatan = (cols[3] || '').trim(); // Kolom D = JABATAN
      const stasiun = extractStasiun(jabatan);
      return { nama, jabatan, stasiun };
    }
  }

  throw new Error(`NIPP "${nipp}" tidak ditemukan di data personil.`);
}
