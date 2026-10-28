import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { toCsv } from '../shared';
import { storage } from './firebase';

/** Resizes an image in the browser (longest side `max` px, JPEG) before upload. */
export async function resizeImage(file: File, max = 1280, square = false, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  let sx = 0;
  let sy = 0;
  let sw = bitmap.width;
  let sh = bitmap.height;
  if (square) {
    const side = Math.min(sw, sh);
    sx = (sw - side) / 2;
    sy = (sh - side) / 2;
    sw = sh = side;
  }
  const scale = Math.min(1, max / Math.max(sw, sh));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  canvas.getContext('2d')!.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process image'))), 'image/jpeg', quality),
  );
}

export async function uploadImage(path: string, file: File, opts: { max?: number; square?: boolean } = {}): Promise<string> {
  const blob = await resizeImage(file, opts.max ?? 1280, opts.square ?? false);
  const r = ref(storage, path);
  await uploadBytes(r, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(r);
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[], columns?: string[]) {
  const blob = new Blob(['﻿' + toCsv(rows, columns)], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const today = () => new Date().toISOString().slice(0, 10);
