import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import prisma from '../utils/db';
import { requireAuth, requireRole } from '../middleware/auth';
import { getStorageService } from '../services/storage';
import { imageFileFilter, InvalidImageError } from '../utils/uploadFileFilter';

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: imageFileFilter,
});
const storage = getStorageService();

// multipart/form-data fields all arrive as strings regardless of semantic type.
const updateProfileSchema = z.object({
    name: z.string().trim().max(50).optional(),
    company: z.string().trim().max(100).optional(),
    phone: z.string().trim().max(20).optional(),
    garage: z.string().trim().max(200).optional(),
    busNumber: z.string().trim().max(50).optional(),
    busType: z.string().trim().max(50).optional(),
    busYear: z.string().trim().max(10).optional(),
    driverComment: z.string().trim().max(500).optional(),
    capacity: z.string().trim().max(10).optional(),
    keepVehicleImageUrls: z.string().max(5000).optional(),
});

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

        try {
            const body = updateProfileSchema.parse(req.body);

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
                const raw = body.keepVehicleImageUrls;
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

            const capacityValue = body.capacity ? Number(body.capacity) : null;

            const user = await prisma.user.update({
                where: { id: req.user!.userId },
                data: {
                    displayName: body.name || null,
                    companyName: body.company || null,
                    phoneNumber: body.phone || null,
                    garageAddress: body.garage || null,
                    busNumber: body.busNumber || null,
                    busType: body.busType || null,
                    busYear: body.busYear || null,
                    driverComment: body.driverComment || null,
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
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res
                    .status(400)
                    .json({ error: 'Invalid input', details: error.errors });
            }
            if (error instanceof InvalidImageError) {
                return res.status(400).json({ error: error.message });
            }
            if ((error as { code?: string })?.code === 'P2002') {
                return res
                    .status(400)
                    .json({ error: '이미 사용 중인 휴대전화번호입니다' });
            }
            console.error('Profile update error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

export default router;
