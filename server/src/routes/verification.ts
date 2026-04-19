import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../utils/db';
import { requireAuth, requireRole } from '../middleware/auth';
import { UserRole, VerificationStatus } from '@prisma/client';

const router = express.Router();
const uploadRoot = path.join(process.cwd(), 'uploads');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const userRole = req.user?.role;
        const folder =
            userRole === 'Driver'
                ? 'driver-licenses'
                : userRole === 'BusCompany'
                ? 'company-registrations'
                : 'other';
        const targetDir = path.join(uploadRoot, folder);
        fs.mkdirSync(targetDir, { recursive: true });
        cb(null, targetDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || '');
        const safeExt = ext || '.jpg';
        const name = `${req.user?.userId}-${Date.now()}${safeExt}`;
        cb(null, name);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
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

        const relativePath = `/uploads/${path
            .relative(uploadRoot, req.file.path)
            .replace(/\\/g, '/')}`;

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
    }
);

export default router;
