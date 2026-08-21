// Visual Identity Sprint, Phase A (2026-08-21): production icon
// generator for BEYOND's current approved brand mark.
//
// PROVENANCE: this reads references/beyond/beyond-logo-source.png — a
// RASTER export of the approved Abstract B artwork, supplied directly
// by Gavin after several rounds of vector-reconstruction attempts were
// reviewed and rejected as insufficiently faithful to the approved
// visual. Per that decision, this script does NOT redraw, trace,
// recolor, or otherwise reinterpret the artwork's own pixels — it only
// crops to content, scales, and composites onto BEYOND's exact --bg.
// The glow visible in the output is baked into the source raster itself
// (real alpha data, not something this script adds) and is NOT a
// general BEYOND UI effect — see docs/UX_DECISIONS.md before reusing
// glow anywhere else.
//
// REPLACEABILITY: when a final production vector (SVG) master is
// approved, replace this script's role with an SVG rasterizer pointed
// at that file — the output contract (public/icons/icon-192.png,
// icon-512.png) stays identical, so nothing else in the app needs to
// change. scripts/generate-icons.mjs (the original procedural diamond
// generator) is left untouched alongside this file for history/
// rollback; it is no longer what produces the live icons.
//
// Dependency-free — decodes/encodes PNG by hand (same technique as
// generate-icons.mjs), since the only available image tooling in this
// environment was the Read/Write toolset, not ImageMagick or a
// node_modules image library.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { inflateSync, deflateSync } from "node:zlib";

const SRC = "references/beyond/beyond-logo-source.png";
const BG = [10, 10, 10, 255]; // exact --bg token

function decodePng(path) {
  const buf = readFileSync(path);
  let offset = 8;
  const idat = [];
  let w, h;
  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.slice(offset + 4, offset + 8).toString("ascii");
    const data = buf.slice(offset + 8, offset + 8 + len);
    if (type === "IHDR") {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) {
        throw new Error("expected 8-bit RGBA non-interlaced PNG");
      }
    }
    if (type === "IDAT") idat.push(data);
    offset += 8 + len + 4;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = w * bpp;
  const pixels = Buffer.alloc(h * stride);
  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  };
  for (let y = 0; y < h; y++) {
    const filterType = raw[y * (stride + 1)];
    const srcStart = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x++) {
      const rawByte = raw[srcStart + x];
      const a = x >= bpp ? pixels[y * stride + x - bpp] : 0;
      const b = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? pixels[(y - 1) * stride + x - bpp] : 0;
      let val;
      if (filterType === 0) val = rawByte;
      else if (filterType === 1) val = (rawByte + a) & 0xff;
      else if (filterType === 2) val = (rawByte + b) & 0xff;
      else if (filterType === 3) val = (rawByte + Math.floor((a + b) / 2)) & 0xff;
      else if (filterType === 4) val = (rawByte + paeth(a, b, c)) & 0xff;
      else throw new Error("unknown filter " + filterType);
      pixels[y * stride + x] = val;
    }
  }
  return { w, h, pixels };
}

function crc32(buf) {
  let c;
  const table = crc32.table ?? (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = deflateSync(raw);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

const { w: SW, h: SH, pixels: SRC_PX } = decodePng(SRC);
console.log("source:", SW, "x", SH);

function alphaAt(x, y) {
  return SRC_PX[(y * SW + x) * 4 + 3];
}

// Content bounding box: any pixel with meaningful alpha (>18, well above
// the glow's faint falloff, so the box tracks the actual mark+visible
// glow core rather than the glow's near-invisible tail).
const THRESHOLD = 18;
let minX = SW, minY = SH, maxX = 0, maxY = 0;
for (let y = 0; y < SH; y++) {
  for (let x = 0; x < SW; x++) {
    if (alphaAt(x, y) > THRESHOLD) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
console.log("content bbox:", { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY });

// Bilinear sample from source at fractional (sx, sy), alpha-composited
// over transparent (returns straight RGBA).
function sampleSrc(sx, sy) {
  const x0 = Math.floor(sx), y0 = Math.floor(sy);
  const x1 = Math.min(x0 + 1, SW - 1), y1 = Math.min(y0 + 1, SH - 1);
  const fx = sx - x0, fy = sy - y0;
  const get = (x, y) => {
    const i = (y * SW + x) * 4;
    return [SRC_PX[i], SRC_PX[i + 1], SRC_PX[i + 2], SRC_PX[i + 3]];
  };
  const p00 = get(x0, y0), p10 = get(x1, y0), p01 = get(x0, y1), p11 = get(x1, y1);
  const lerp = (a, b, t) => a + (b - a) * t;
  const out = [0, 0, 0, 0];
  for (let c = 0; c < 4; c++) {
    const top = lerp(p00[c], p10[c], fx);
    const bot = lerp(p01[c], p11[c], fx);
    out[c] = lerp(top, bot, fy);
  }
  return out;
}

// Render one output icon: square `size`, mark's content bbox scaled to
// fill `fillFrac` of the square (safe-zone margin), composited over BG.
// centerBiasX/Y (in bbox-widths) nudge for optical (not just
// mathematical) centering — the mark's own visual weight sits slightly
// lower/right than its bbox center.
function renderIcon(size, fillFrac, centerBiasX = 0, centerBiasY = 0) {
  const bboxW = maxX - minX, bboxH = maxY - minY;
  const scale = (size * fillFrac) / Math.max(bboxW, bboxH);
  const destW = bboxW * scale, destH = bboxH * scale;
  const destX = (size - destW) / 2 - centerBiasX * size;
  const destY = (size - destH) / 2 - centerBiasY * size;

  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let r = BG[0], g = BG[1], b = BG[2];
      if (x >= destX && x < destX + destW && y >= destY && y < destY + destH) {
        const sx = minX + (x - destX) / scale;
        const sy = minY + (y - destY) / scale;
        const [sr, sg, sb, sa] = sampleSrc(sx, sy);
        const a = sa / 255;
        r = sr * a + BG[0] * (1 - a);
        g = sg * a + BG[1] * (1 - a);
        b = sb * a + BG[2] * (1 - a);
      }
      out[i] = Math.round(r);
      out[i + 1] = Math.round(g);
      out[i + 2] = Math.round(b);
      out[i + 3] = 255;
    }
  }
  return out;
}

mkdirSync("public/icons", { recursive: true });
// Optical centering: the mark's visual mass (glow included) sits
// slightly left-heavy/upper-heavy relative to its raw bbox because the
// lower-right tip is a thin point — nudge right/down slightly.
const BIAS_X = -0.015;
const BIAS_Y = -0.01;
// 0.78 fill fraction — generous safe-zone margin (matches the ~60-78%
// range generate-icons.mjs's own diamond used), so the mark never
// touches the edge and survives maskable-icon cropping on Android.
for (const size of [192, 512]) {
  const px = renderIcon(size, 0.78, BIAS_X, BIAS_Y);
  writeFileSync(`public/icons/icon-${size}.png`, encodePng(size, px));
}
console.log("wrote public/icons/icon-192.png and icon-512.png");
