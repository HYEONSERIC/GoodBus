import { Request } from 'express';
import multer from 'multer';

// Server-trusted mapping only — never derive the on-disk extension from a
// client-supplied filename, or a file named "x.html" served with a spoofed
// image/* Content-Type ends up written and served back as .html.
export const IMAGE_MIME_TO_EXTENSION: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
};

export function imageFileFilter(
    req: Request,
    file: Express.Multer.File,
    callback: multer.FileFilterCallback
) {
    if (Object.prototype.hasOwnProperty.call(IMAGE_MIME_TO_EXTENSION, file.mimetype)) {
        callback(null, true);
    } else {
        callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
    }
}

// multer's fileFilter only sees the declared Content-Type, not the bytes (the
// upload hasn't been read yet at that point) — a renamed/relabeled non-image file
// sails through as "image/png". This checks the actual file signature once the
// bytes are available (after upload), so it has to run at each storage call site
// instead, not as another multer fileFilter.
const MAGIC_BYTE_CHECKS: Record<string, (buf: Buffer) => boolean> = {
    'image/jpeg': (buf) =>
        buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
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
    'image/gif': (buf) =>
        buf.length >= 6 &&
        (buf.toString('ascii', 0, 6) === 'GIF87a' ||
            buf.toString('ascii', 0, 6) === 'GIF89a'),
    'image/webp': (buf) =>
        buf.length >= 12 &&
        buf.toString('ascii', 0, 4) === 'RIFF' &&
        buf.toString('ascii', 8, 12) === 'WEBP',
};

export function isValidImageBuffer(buffer: Buffer, mimetype: string): boolean {
    const check = MAGIC_BYTE_CHECKS[mimetype];
    return check ? check(buffer) : false;
}

export class InvalidImageError extends Error {
    constructor(message = '올바르지 않은 이미지 파일입니다') {
        super(message);
        this.name = 'InvalidImageError';
    }
}
