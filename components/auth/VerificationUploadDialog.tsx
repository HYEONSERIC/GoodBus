'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type VerificationUploadDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    status?: string | null;
    rejectionNote?: string | null;
    existingImageUrl?: string | null;
    imageAlt: string;
    fileInputLabel: string;
    uploading: boolean;
    onUpload: () => void;
    onFileChange: (file: File | null) => void;
};

export function VerificationUploadDialog({
    open,
    onOpenChange,
    title,
    description,
    status,
    rejectionNote,
    existingImageUrl,
    imageAlt,
    fileInputLabel,
    uploading,
    onUpload,
    onFileChange,
}: VerificationUploadDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    {status && (
                        <p className="text-sm text-gray-600">
                            현재 상태: {status}
                        </p>
                    )}
                    {rejectionNote && (
                        <p className="text-sm text-gray-600">
                            반려 사유: {rejectionNote}
                        </p>
                    )}
                    {existingImageUrl && (
                        <img
                            src={existingImageUrl}
                            alt={imageAlt}
                            className="max-h-56 w-full rounded border object-contain bg-white"
                        />
                    )}
                    <div className="space-y-2">
                        <Label>{fileInputLabel}</Label>
                        <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                                onFileChange(e.target.files?.[0] || null)
                            }
                        />
                    </div>
                    <Button onClick={onUpload} disabled={uploading}>
                        {uploading ? '업로드 중...' : '업로드'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
