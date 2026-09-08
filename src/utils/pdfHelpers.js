import { PDFDocument } from 'pdf-lib';

/**
 * Baca file sebagai ArrayBuffer
 */
export const readFileAsArrayBuffer = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

/**
 * Konversi file gambar (JPG/PNG) menjadi satu halaman PDF A4 portrait
 */
export async function imageToPdfPage(pdfDoc, file) {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const bytes = new Uint8Array(arrayBuffer);

  let image;
  if (file.type === 'image/png') {
    image = await pdfDoc.embedPng(bytes);
  } else {
    image = await pdfDoc.embedJpg(bytes);
  }

  const A4W = 595;
  const A4H = 842;
  const { width: imgW, height: imgH } = image;
  const ratio = Math.min(A4W / imgW, A4H / imgH);
  const drawW = imgW * ratio;
  const drawH = imgH * ratio;

  const page = pdfDoc.addPage([A4W, A4H]);
  page.drawImage(image, {
    x: (A4W - drawW) / 2,
    y: (A4H - drawH) / 2,
    width: drawW,
    height: drawH,
  });
}

/**
 * Download blob sebagai file
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
