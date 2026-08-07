import fs from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';
import { IMAGE_MIME_TO_EXTENSION } from '../utils/uploadFileFilter';

type SaveFileInput = {
    buffer: Buffer;
    mimetype: string;
    folder: string;
    filePrefix: string;
};

export interface StorageService {
    saveFile(input: SaveFileInput): Promise<string>;
}

class LocalStorageService implements StorageService {
    private root = path.join(process.cwd(), 'uploads');

    async saveFile({
        buffer,
        mimetype,
        folder,
        filePrefix,
    }: SaveFileInput): Promise<string> {
        const ext = IMAGE_MIME_TO_EXTENSION[mimetype] ?? '.bin';
        const dir = path.join(this.root, folder);
        const filename = `${filePrefix}-${Date.now()}-${randomBytes(4).toString('hex')}${ext}`;
        const absolutePath = path.join(dir, filename);

        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(absolutePath, buffer);

        return `/uploads/${folder}/${filename}`;
    }
}

class S3StorageService implements StorageService {
    async saveFile(): Promise<string> {
        throw new Error(
            'S3 storage provider is not configured yet. Set STORAGE_PROVIDER=local for now.'
        );
    }
}

export function getStorageService(): StorageService {
    const provider = process.env.STORAGE_PROVIDER || 'local';

    if (provider === 's3') {
        return new S3StorageService();
    }

    return new LocalStorageService();
}
