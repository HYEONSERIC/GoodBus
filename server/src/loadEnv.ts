import dotenv from 'dotenv';
import path from 'path';

// Imported as the very first line of index.ts so env vars are guaranteed to
// be loaded before any other module (jwt.ts, db.ts, ...) evaluates its
// module-level `process.env.X` reads.
dotenv.config({
    path: path.resolve(__dirname, '../.env'),
    override: true,
});

// Asserted here — not left to jwt.ts's own module-level throw — so the
// fail-fast doesn't depend on some route file transitively importing jwt.ts
// before anything else touches process.env.JWT_SECRET.
if (!process.env.JWT_SECRET?.trim()) {
    throw new Error('JWT_SECRET environment variable is required');
}
