import { describe, expect, it, vi } from 'vitest';
import multer from 'multer';
import { imageFileFilter, IMAGE_MIME_TO_EXTENSION } from './uploadFileFilter';

function fakeFile(mimetype: string): Express.Multer.File {
    return { mimetype, fieldname: 'file' } as Express.Multer.File;
}

describe('imageFileFilter', () => {
    it.each(Object.keys(IMAGE_MIME_TO_EXTENSION))(
        '허용된 이미지 mimetype(%s)은 통과시킨다',
        (mimetype) => {
            const callback = vi.fn();
            imageFileFilter({} as never, fakeFile(mimetype), callback);
            expect(callback).toHaveBeenCalledWith(null, true);
        },
    );

    it('허용되지 않은 mimetype(예: text/html)은 MulterError로 거부한다', () => {
        const callback = vi.fn();
        imageFileFilter({} as never, fakeFile('text/html'), callback);

        expect(callback).toHaveBeenCalledTimes(1);
        const [err, accepted] = callback.mock.calls[0];
        expect(err).toBeInstanceOf(multer.MulterError);
        expect(accepted).toBeUndefined();
    });

    it('mimetype을 스푸핑한 실행파일(application/x-msdownload)도 거부한다', () => {
        const callback = vi.fn();
        imageFileFilter({} as never, fakeFile('application/x-msdownload'), callback);

        const [err] = callback.mock.calls[0];
        expect(err).toBeInstanceOf(multer.MulterError);
    });
});
