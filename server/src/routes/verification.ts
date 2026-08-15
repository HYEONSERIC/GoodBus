import express from 'express';
import multer from 'multer';
import prisma from '../utils/db';
import { requireAuth, requireRole } from '../middleware/auth';
import { UserRole, VerificationStatus } from '@prisma/client';
import { imageFileFilter, InvalidImageError } from '../utils/uploadFileFilter';
import { getStorageService } from '../services/storage';

const router = express.Router();
const storage = getStorageService();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFileFilter,
});

router.get(
    '/me',
    requireAuth,
    requireRole(UserRole.Driver, UserRole.BusCompany),
    async (req, res) => {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.userId },
            select: {
                role: true,
                driverLicenseUrl: true,
                driverLicenseStatus: true,
                driverLicenseNote: true,
                companyRegistrationUrl: true,
                companyRegistrationStatus: true,
                companyRegistrationNote: true,
            },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ verification: user });
    }
);

router.post(
    '/upload',
    requireAuth,
    requireRole(UserRole.Driver, UserRole.BusCompany),
    upload.single('file'),
    async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: 'File is required' });
        }

        try {
            const folder =
                req.user?.role === 'Driver'
                    ? 'driver-licenses'
                    : 'company-registrations';
            const relativePath = await storage.saveFile({
                buffer: req.file.buffer,
                mimetype: req.file.mimetype,
                folder,
                filePrefix: req.user!.userId,
            });

            const data =
                req.user?.role === 'Driver'
                    ? {
                          driverLicenseUrl: relativePath,
                          driverLicenseStatus: VerificationStatus.pending,
                          driverLicenseNote: null,
                      }
                    : {
                          companyRegistrationUrl: relativePath,
                          companyRegistrationStatus: VerificationStatus.pending,
                          companyRegistrationNote: null,
                      };

            const user = await prisma.user.update({
                where: { id: req.user!.userId },
                data,
                select: {
                    role: true,
                    driverLicenseUrl: true,
                    driverLicenseStatus: true,
                    driverLicenseNote: true,
                    companyRegistrationUrl: true,
                    companyRegistrationStatus: true,
                    companyRegistrationNote: true,
                },
            });

            res.json({ verification: user });
        } catch (error) {
            if (error instanceof InvalidImageError) {
                return res.status(400).json({ error: error.message });
            }
            console.error('Verification upload error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

export default router;
