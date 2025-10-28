import { UserRole, TripStatus, BidStatus, BusSize } from '@prisma/client';

export interface JWTPayload {
    userId: string;
    role: UserRole;
}

export interface AuthenticatedRequest extends Express.Request {
    user?: JWTPayload;
}

export { UserRole, TripStatus, BidStatus, BusSize };
