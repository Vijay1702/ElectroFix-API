// Client-supplied file extension and Content-Type are trivially spoofable, so multer's
// fileFilter (which only checks those) isn't sufficient on its own. This checks the actual
// magic bytes of the uploaded buffer against the mimetype it claims to be.
const SIGNATURES: Record<string, (buf: Buffer) => boolean> = {
  'image/jpeg': (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  'image/png': (buf) =>
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a,
  'application/pdf': (buf) =>
    buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46,
};

export const matchesFileSignature = (buffer: Buffer, mimetype: string): boolean => {
  const check = SIGNATURES[mimetype];
  return check ? check(buffer) : false;
};
