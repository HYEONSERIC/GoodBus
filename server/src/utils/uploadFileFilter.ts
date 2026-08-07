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
