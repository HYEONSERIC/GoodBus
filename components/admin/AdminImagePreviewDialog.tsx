'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export function AdminImagePreviewDialog({
    previewUrl,
    onClose,
}: {
    previewUrl: string | null;
    onClose: () => void;
}) {
    return (
        <Dialog
            open={Boolean(previewUrl)}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>이미지 미리보기</DialogTitle>
                    <DialogDescription>
                        클릭한 이미지를 크게 확인합니다.
                    </DialogDescription>
                </DialogHeader>
                {previewUrl && (
                    <img
                        src={previewUrl}
                        alt="미리보기"
                        className="max-h-[70vh] w-full rounded border object-contain bg-white"
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
