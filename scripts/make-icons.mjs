import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public');

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

function encodePng(width, height, data) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    data.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function encodeIco(png) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header[6] = 32;
  header[7] = 32;
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  return Buffer.concat([header, png]);
}

function canvas(width, height) {
  const data = Buffer.alloc(width * height * 4);
  const api = {
    fill(r, g, b) {
      for (let i = 0; i < data.length; i += 4) {
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      }
    },
    shade(y0, y1, stops) {
      for (let y = Math.max(0, y0); y < Math.min(height, y1); y++) {
        const t = (y - y0) / Math.max(1, y1 - y0);
        let a = stops[0];
        let b = stops[stops.length - 1];
        for (let i = 0; i < stops.length - 1; i++) {
          if (t >= stops[i].t && t <= stops[i + 1].t) {
            a = stops[i];
            b = stops[i + 1];
            break;
          }
        }
        const u = (t - a.t) / Math.max(0.0001, b.t - a.t);
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          data[i] = a.r + (b.r - a.r) * u;
          data[i + 1] = a.g + (b.g - a.g) * u;
          data[i + 2] = a.b + (b.b - a.b) * u;
          data[i + 3] = 255;
        }
      }
    },
    plot(x, y, r, g, b, a) {
      x = Math.round(x);
      y = Math.round(y);
      if (x < 0 || y < 0 || x >= width || y >= height || a <= 0) return;
      const i = (y * width + x) * 4;
      const sa = Math.min(1, a);
      const da = data[i + 3] / 255;
      const outA = sa + da * (1 - sa);
      data[i] = (r * sa + data[i] * da * (1 - sa)) / outA;
      data[i + 1] = (g * sa + data[i + 1] * da * (1 - sa)) / outA;
      data[i + 2] = (b * sa + data[i + 2] * da * (1 - sa)) / outA;
      data[i + 3] = outA * 255;
    },
    circle(cx, cy, rad, r, g, b) {
      for (let y = Math.floor(cy - rad - 1); y <= Math.ceil(cy + rad + 1); y++) {
        for (let x = Math.floor(cx - rad - 1); x <= Math.ceil(cx + rad + 1); x++) {
          const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
          api.plot(x, y, r, g, b, Math.min(1, rad + 0.6 - d));
        }
      }
    },
    ellipse(cx, cy, rx, ry, r, g, b) {
      for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
        for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
          const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
          api.plot(x, y, r, g, b, Math.min(1, (1.05 - d) * Math.min(rx, ry)));
        }
      }
    },
    png() {
      return encodePng(width, height, data);
    },
  };
  return api;
}

const FONT = {
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01110'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
};

function word(canvasApi, text, x, y, scale, r, g, b) {
  let cursor = x;
  for (const ch of text) {
    const rows = FONT[ch];
    if (!rows) continue;
    rows.forEach((row, ry) => {
      [...row].forEach((bit, rx) => {
        if (bit === '1') canvasApi.ellipse(cursor + rx * scale, y + ry * scale, scale * 0.48, scale * 0.48, r, g, b);
      });
    });
    cursor += 6 * scale;
  }
}

function dawn(c) {
  c.shade(0, c.height, [
    { t: 0, r: 116, g: 176, b: 214 },
    { t: 0.45, r: 244, g: 196, b: 150 },
    { t: 0.72, r: 232, g: 168, b: 112 },
    { t: 1, r: 92, g: 158, b: 78 },
  ]);
}

function pip(c, cx, cy, s) {
  c.ellipse(cx, cy - s * 0.55, s * 0.22, s * 0.42, 110, 176, 78);
  c.circle(cx, cy, s * 0.46, 78, 168, 74);
  c.circle(cx, cy + s * 0.08, s * 0.2, 214, 236, 186);
  c.circle(cx - s * 0.16, cy - s * 0.06, s * 0.07, 32, 28, 24);
  c.circle(cx + s * 0.16, cy - s * 0.06, s * 0.07, 32, 28, 24);
  c.circle(cx - s * 0.18, cy - s * 0.1, s * 0.025, 255, 248, 236);
  c.circle(cx + s * 0.14, cy - s * 0.1, s * 0.025, 255, 248, 236);
}

function drawIcon(size) {
  const c = canvas(size, size);
  dawn(c);
  c.circle(size * 0.78, size * 0.22, size * 0.1, 255, 214, 140);
  pip(c, size * 0.5, size * 0.58, size * 0.42);
  return c.png();
}

await mkdir(out, { recursive: true });
const icon512 = drawIcon(512);
await writeFile(path.join(out, 'icon-512.png'), icon512);
await writeFile(path.join(out, 'icon-192.png'), drawIcon(192));
await writeFile(path.join(out, 'icon-180.png'), drawIcon(180));
const small = drawIcon(32);
await writeFile(path.join(out, 'favicon-32.png'), small);
await writeFile(path.join(out, 'favicon.ico'), encodeIco(small));

const og = canvas(1200, 630);
dawn(og);
og.circle(980, 120, 70, 255, 214, 140);
pip(og, 860, 360, 280);
word(og, 'KINDLING', 90, 250, 22, 42, 36, 28);
await writeFile(path.join(out, 'og.png'), og.png());
