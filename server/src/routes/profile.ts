import express from 'express';
import multer from 'multer';
import { UserRole } from '@prisma/client';
import prisma from '../utils/db';
import { requireAuth, requireRole } from '../middleware/auth';
import { getStorageService } from '../services/storage';
import { imageFileFilter } from '../utils/uploadFileFilter';

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: imageFileFilter,
});
const storage = getStorageService();

router.get(
    '/me',
    requireAuth,
    requireRole(UserRole.Driver, UserRole.BusCompany),
    async (req, res) => {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.userId },
            select: {
                id: true,
                role: true,
                displayName: true,
                companyName: true,
                phoneNumber: true,
                garageAddress: true,
                busNumber: true,
                busType: true,
                busYear: true,
                capacity: true,
                driverComment: true,
                profileImageUrl: true,
                vehicleImageUrls: true,
            },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ profile: user });
    }
);

router.patch(
    '/me',
    requireAuth,
    requireRole(UserRole.Driver, UserRole.BusCompany),
    upload.fields([
        { name: 'profilePhoto', maxCount: 1 },
        { name: 'vehiclePhotos', maxCount: 4 },
    ]),
    async (req, res) => {
        const files = req.files as
            | {
                  profilePhoto?: Express.Multer.File[];
                  vehiclePhotos?: Express.Multer.File[];
              }
            | undefined;

        const profilePhoto = files?.profilePhoto?.[0];
        const vehiclePhotos = files?.vehiclePhotos || [];

        const currentUser = await prisma.user.findUnique({
            where: { id: req.user!.userId },
            select: { vehicleImageUrls: true },
        });

        if (!currentUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        let profileImageUrl: string | undefined;
        if (profilePhoto) {
            profileImageUrl = await storage.saveFile({
                buffer: profilePhoto.buffer,
                mimetype: profilePhoto.mimetype,
                folder: 'profile-images',
                filePrefix: req.user!.userId,
            });
        }

        const parseKeepVehicleUrls = (): string[] => {
            const raw = req.body.keepVehicleImageUrls;
            if (typeof raw !== 'string' || !raw.trim()) return [];
            try {
                const parsed = JSON.parse(raw);
                if (!Array.isArray(parsed)) return [];
                return parsed.filter((v) => typeof v === 'string');
            } catch {
                return [];
            }
        };

        const keepRequested = parseKeepVehicleUrls();
        const keepAllowed = keepRequested.filter((url) =>
            currentUser.vehicleImageUrls.includes(url)
        );

        const nextVehicleUrls: string[] = [...keepAllowed];
        if (vehiclePhotos.length > 0) {
            const newUrls = await Promise.all(
                vehiclePhotos.slice(0, 4).map((file, index) =>
                    storage.saveFile({
                        buffer: file.buffer,
                        mimetype: file.mimetype,
                        folder: 'vehicle-images',
                        filePrefix: `${req.user!.userId}-${Date.now()}-${index}`,
                    })
                )
            );
            nextVehicleUrls.push(...newUrls);
        }

        const vehicleImageUrls =
            nextVehicleUrls.length > 0 ? nextVehicleUrls.slice(0, 4) : undefined;

        const capacityValue =
            typeof req.body.capacity === 'string' && req.body.capacity.trim()
                ? Number(req.body.capacity)
                : null;

        const user = await prisma.user.update({
            where: { id: req.user!.userId },
            data: {
                displayName: req.body.name || null,
                companyName: req.body.company || null,
                phoneNumber: req.body.phone || null,
                garageAddress: req.body.garage || null,
                busNumber: req.body.busNumber || null,
                busType: req.body.busType || null,
                busYear: req.body.busYear || null,
                driverComment: req.body.driverComment || null,
                capacity:
                    capacityValue !== null && Number.isFinite(capacityValue)
                        ? capacityValue
                        : null,
                ...(profileImageUrl ? { profileImageUrl } : {}),
                ...(vehicleImageUrls
                    ? { vehicleImageUrls }
                    : { vehicleImageUrls: currentUser.vehicleImageUrls }),
            },
            select: {
                id: true,
                role: true,
                displayName: true,
                companyName: true,
                phoneNumber: true,
                garageAddress: true,
                busNumber: true,
                busType: true,
                busYear: true,
                capacity: true,
                driverComment: true,
                profileImageUrl: true,
                vehicleImageUrls: true,
            },
        });

        res.json({ profile: user });
    }
);

export default router;
