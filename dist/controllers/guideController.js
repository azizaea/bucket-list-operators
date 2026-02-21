import { PrismaClient } from '@prisma/client';
import { hashPassword, validatePassword } from '../utils/password.js';
import { generateTokens } from '../utils/jwt.js';
const prisma = new PrismaClient();
/**
 * POST /api/guides/register - Register new guide
 */
export async function registerGuide(req, res) {
    try {
        const { email, password, fullName, phone, licenseNumber, languages, specialties, location, bio, hourlyRate, } = req.body;
        if (!email || !password || !fullName || !phone || !licenseNumber || !location) {
            res.status(400).json({
                success: false,
                error: 'Missing required fields: email, password, fullName, phone, licenseNumber, location',
            });
            return;
        }
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            res.status(400).json({
                success: false,
                error: passwordValidation.error,
            });
            return;
        }
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({
                success: false,
                error: 'Email already registered',
            });
            return;
        }
        const passwordHash = await hashPassword(password);
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: { email, passwordHash },
            });
            const guide = await tx.guide.create({
                data: {
                    userId: user.id,
                    fullName,
                    phone,
                    email,
                    licenseNumber,
                    licenseStatus: 'PENDING',
                    languages: Array.isArray(languages) ? languages : [],
                    specialties: Array.isArray(specialties) ? specialties : [],
                    location,
                    bio: bio ?? null,
                    hourlyRate: hourlyRate != null ? hourlyRate : null,
                    isActive: true,
                },
            });
            return { user, guide };
        });
        const tokens = generateTokens({
            userId: result.user.id,
            guideId: result.guide.id,
            email: result.user.email,
            role: 'guide',
        });
        res.status(201).json({
            success: true,
            data: {
                guide: {
                    id: result.guide.id,
                    fullName: result.guide.fullName,
                    email: result.guide.email,
                    licenseStatus: result.guide.licenseStatus,
                },
                tokens,
            },
        });
    }
    catch (error) {
        console.error('Guide registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Registration failed',
        });
    }
}
/**
 * POST /api/guides/login - Guide login (separate from operator login)
 */
export async function loginGuide(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({
                success: false,
                error: 'Email and password are required',
            });
            return;
        }
        const { comparePassword } = await import('../utils/password.js');
        const user = await prisma.user.findUnique({
            where: { email },
            include: { guides: true },
        });
        if (!user || user.guides.length === 0) {
            res.status(401).json({
                success: false,
                error: 'Invalid email or password',
            });
            return;
        }
        const guide = user.guides[0];
        if (!guide.isActive) {
            res.status(401).json({
                success: false,
                error: 'Account is deactivated',
            });
            return;
        }
        const isValid = await comparePassword(password, user.passwordHash);
        if (!isValid) {
            res.status(401).json({
                success: false,
                error: 'Invalid email or password',
            });
            return;
        }
        const tokens = generateTokens({
            userId: user.id,
            guideId: guide.id,
            email: user.email,
            role: 'guide',
            operatorId: guide.operatorId ?? undefined,
        });
        res.json({
            success: true,
            data: {
                guide: {
                    id: guide.id,
                    fullName: guide.fullName,
                    email: guide.email,
                    licenseStatus: guide.licenseStatus,
                },
                tokens,
            },
        });
    }
    catch (error) {
        console.error('Guide login error:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed',
        });
    }
}
/**
 * POST /api/guides/refresh - Refresh access token for guides
 */
export async function refreshGuideToken(req, res) {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            res.status(400).json({
                success: false,
                error: 'Refresh token is required',
            });
            return;
        }
        const { verifyRefreshToken } = await import('../utils/jwt.js');
        const decoded = verifyRefreshToken(refreshToken);
        if (decoded.role !== 'guide' || !decoded.guideId) {
            res.status(401).json({
                success: false,
                error: 'Invalid refresh token',
            });
            return;
        }
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: { guides: true },
        });
        if (!user || user.guides.length === 0) {
            res.status(401).json({
                success: false,
                error: 'User not found',
            });
            return;
        }
        const guide = user.guides[0];
        if (!guide.isActive) {
            res.status(401).json({
                success: false,
                error: 'Account is deactivated',
            });
            return;
        }
        const tokens = generateTokens({
            userId: user.id,
            guideId: guide.id,
            email: user.email,
            role: 'guide',
            operatorId: guide.operatorId ?? undefined,
        });
        res.json({
            success: true,
            data: { tokens },
        });
    }
    catch (error) {
        res.status(401).json({
            success: false,
            error: 'Invalid refresh token',
        });
    }
}
/**
 * GET /api/guides/profile - Get guide profile (authenticated guide)
 */
export async function getGuideProfile(req, res) {
    try {
        const guideId = req.user?.guideId;
        if (!guideId) {
            res.status(401).json({ success: false, error: 'Not authenticated as guide' });
            return;
        }
        const guide = await prisma.guide.findFirst({
            where: { id: guideId },
            include: { user: { select: { email: true } } },
        });
        if (!guide) {
            res.status(404).json({ success: false, error: 'Guide not found' });
            return;
        }
        res.json({
            success: true,
            data: {
                guide: {
                    ...guide,
                    user: undefined,
                    email: guide.email,
                },
            },
        });
    }
    catch (error) {
        console.error('Get guide profile error:', error);
        res.status(500).json({ success: false, error: 'Failed to get profile' });
    }
}
/**
 * PUT /api/guides/profile - Update guide profile
 */
export async function updateGuideProfile(req, res) {
    try {
        const guideId = req.user?.guideId;
        if (!guideId) {
            res.status(401).json({ success: false, error: 'Not authenticated as guide' });
            return;
        }
        const { fullName, phone, languages, specialties, location, bio, hourlyRate, availability, isActive, storeSlug, } = req.body;
        const updateData = {};
        if (fullName !== undefined)
            updateData.fullName = fullName;
        if (phone !== undefined)
            updateData.phone = phone;
        if (languages !== undefined)
            updateData.languages = Array.isArray(languages) ? languages : [];
        if (specialties !== undefined)
            updateData.specialties = Array.isArray(specialties) ? specialties : [];
        if (location !== undefined)
            updateData.location = location;
        if (bio !== undefined)
            updateData.bio = bio;
        if (hourlyRate !== undefined)
            updateData.hourlyRate = hourlyRate;
        if (availability !== undefined)
            updateData.availability = availability;
        if (isActive !== undefined)
            updateData.isActive = isActive;
        if (storeSlug !== undefined) {
            if (typeof storeSlug !== 'string') {
                res.status(400).json({ success: false, error: 'storeSlug must be a string' });
                return;
            }
            updateData.storeSlug = storeSlug.trim() || null;
        }
        const guide = await prisma.guide.update({
            where: { id: guideId },
            data: updateData,
        });
        res.json({
            success: true,
            data: { guide },
        });
    }
    catch (error) {
        console.error('Update guide profile error:', error);
        res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
}
/**
 * POST /api/guides/license-photo - Upload/update license photo URL
 * Accepts { licensePhotoUrl: string } in body (client uploads to storage, sends URL)
 */
export async function uploadLicensePhoto(req, res) {
    try {
        const guideId = req.user?.guideId;
        if (!guideId) {
            res.status(401).json({ success: false, error: 'Not authenticated as guide' });
            return;
        }
        const { licensePhotoUrl } = req.body;
        if (!licensePhotoUrl || typeof licensePhotoUrl !== 'string') {
            res.status(400).json({
                success: false,
                error: 'licensePhotoUrl is required',
            });
            return;
        }
        const guide = await prisma.guide.update({
            where: { id: guideId },
            data: {
                licensePhotoUrl,
                licenseStatus: 'PENDING',
            },
        });
        res.json({
            success: true,
            data: {
                guide: {
                    id: guide.id,
                    licensePhotoUrl: guide.licensePhotoUrl,
                    licenseStatus: guide.licenseStatus,
                },
            },
        });
    }
    catch (error) {
        console.error('Upload license photo error:', error);
        res.status(500).json({ success: false, error: 'Failed to update license photo' });
    }
}
/**
 * GET /api/guides/:id - Get guide details (for operators)
 */
export async function getGuideById(req, res) {
    try {
        const operatorId = req.user?.operatorId;
        const guideId = String(req.params.id || '');
        if (!operatorId) {
            res.status(401).json({ success: false, error: 'Operator authentication required' });
            return;
        }
        const guide = await prisma.guide.findFirst({
            where: {
                id: guideId,
                OR: [
                    { operatorId },
                    { operatorId: null },
                ],
            },
        });
        if (!guide) {
            res.status(404).json({ success: false, error: 'Guide not found' });
            return;
        }
        res.json({
            success: true,
            data: { guide },
        });
    }
    catch (error) {
        console.error('Get guide error:', error);
        res.status(500).json({ success: false, error: 'Failed to get guide' });
    }
}
/**
 * GET /api/guides - List verified guides (for operators, with filters)
 */
export async function listGuides(req, res) {
    try {
        const operatorId = req.user?.operatorId;
        if (!operatorId) {
            res.status(401).json({ success: false, error: 'Operator authentication required' });
            return;
        }
        const { language, location, specialty, availability, minRating, maxRate, page = '1', limit = '20', } = req.query;
        const where = {
            licenseStatus: 'VERIFIED',
            isActive: true,
            OR: [{ operatorId }, { operatorId: null }],
        };
        const lang = Array.isArray(language) ? language[0] : language;
        const loc = Array.isArray(location) ? location[0] : location;
        const spec = Array.isArray(specialty) ? specialty[0] : specialty;
        if (lang) {
            where.languages = { has: String(lang) };
        }
        if (loc) {
            where.location = { contains: String(loc), mode: 'insensitive' };
        }
        if (spec) {
            where.specialties = { has: String(spec) };
        }
        if (minRating != null) {
            where.rating = { gte: parseFloat(minRating) };
        }
        if (maxRate != null) {
            where.hourlyRate = { lte: parseFloat(maxRate) };
        }
        if (availability === 'true') {
            where.NOT = { availability: null };
        }
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 20;
        const skip = (pageNum - 1) * limitNum;
        const [guides, total] = await Promise.all([
            prisma.guide.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.guide.count({ where }),
        ]);
        res.json({
            success: true,
            data: {
                guides,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum),
                },
            },
        });
    }
    catch (error) {
        console.error('List guides error:', error);
        res.status(500).json({ success: false, error: 'Failed to list guides' });
    }
}
/**
 * GET /api/guides/:id/availability - Get guide's availability calendar
 */
export async function getGuideAvailability(req, res) {
    try {
        const operatorId = req.user?.operatorId;
        const guideId = String(req.params.id || '');
        if (!operatorId) {
            res.status(401).json({ success: false, error: 'Operator authentication required' });
            return;
        }
        const guide = await prisma.guide.findFirst({
            where: {
                id: guideId,
                OR: [{ operatorId }, { operatorId: null }],
            },
            select: { id: true, availability: true },
        });
        if (!guide) {
            res.status(404).json({ success: false, error: 'Guide not found' });
            return;
        }
        res.json({
            success: true,
            data: {
                guideId: guide.id,
                availability: guide.availability ?? {},
            },
        });
    }
    catch (error) {
        console.error('Get guide availability error:', error);
        res.status(500).json({ success: false, error: 'Failed to get availability' });
    }
}
// ============ GUIDE ITINERARIES ============
/**
 * POST /api/guides/itineraries - Create itinerary
 */
export async function createItinerary(req, res) {
    try {
        const guideId = req.user?.guideId;
        if (!guideId) {
            res.status(401).json({ success: false, error: 'Not authenticated as guide' });
            return;
        }
        const { title, destinations, estimatedDuration, price, currency, maxGuests, isPublished, coverImage, itineraryDays, includes, excludes } = req.body;
        if (!title || !destinations || estimatedDuration == null) {
            res.status(400).json({
                success: false,
                error: 'title, destinations, and estimatedDuration are required',
            });
            return;
        }
        const itinerary = await prisma.guideItinerary.create({
            data: {
                guideId,
                title,
                destinations,
                estimatedDuration: parseInt(String(estimatedDuration), 10),
                price: price != null ? price : undefined,
                currency: currency ?? 'SAR',
                maxGuests: maxGuests != null ? parseInt(String(maxGuests), 10) : undefined,
                isPublished: isPublished ?? false,
                coverImage: coverImage ?? undefined,
                itineraryDays: itineraryDays ?? undefined,
                includes: Array.isArray(includes) ? includes : [],
                excludes: Array.isArray(excludes) ? excludes : [],
            },
        });
        res.status(201).json({
            success: true,
            data: { itinerary },
        });
    }
    catch (error) {
        console.error('Create itinerary error:', error);
        res.status(500).json({ success: false, error: 'Failed to create itinerary' });
    }
}
/**
 * GET /api/guides/itineraries - Get guide's itineraries
 */
export async function getGuideItineraries(req, res) {
    try {
        const guideId = req.user?.guideId;
        if (!guideId) {
            res.status(401).json({ success: false, error: 'Not authenticated as guide' });
            return;
        }
        const itineraries = await prisma.guideItinerary.findMany({
            where: { guideId },
            orderBy: { createdAt: 'desc' },
        });
        res.json({
            success: true,
            data: { itineraries },
        });
    }
    catch (error) {
        console.error('Get itineraries error:', error);
        res.status(500).json({ success: false, error: 'Failed to get itineraries' });
    }
}
/**
 * PUT /api/guides/itineraries/:id - Update itinerary
 */
export async function updateItinerary(req, res) {
    try {
        const guideId = req.user?.guideId;
        const itineraryId = String(req.params.id || '');
        if (!guideId) {
            res.status(401).json({ success: false, error: 'Not authenticated as guide' });
            return;
        }
        const existing = await prisma.guideItinerary.findFirst({
            where: { id: itineraryId, guideId },
        });
        if (!existing) {
            res.status(404).json({ success: false, error: 'Itinerary not found' });
            return;
        }
        const { title, destinations, estimatedDuration, price, currency, maxGuests, isPublished, coverImage, itineraryDays, includes, excludes } = req.body;
        const updateData = {};
        if (title !== undefined)
            updateData.title = title;
        if (destinations !== undefined)
            updateData.destinations = destinations;
        if (estimatedDuration !== undefined)
            updateData.estimatedDuration = parseInt(String(estimatedDuration), 10);
        if (price !== undefined)
            updateData.price = price;
        if (currency !== undefined)
            updateData.currency = currency;
        if (maxGuests !== undefined)
            updateData.maxGuests = parseInt(String(maxGuests), 10);
        if (isPublished !== undefined)
            updateData.isPublished = isPublished;
        if (coverImage !== undefined)
            updateData.coverImage = coverImage;
        if (itineraryDays !== undefined)
            updateData.itineraryDays = itineraryDays;
        if (includes !== undefined)
            updateData.includes = Array.isArray(includes) ? includes : [];
        if (excludes !== undefined)
            updateData.excludes = Array.isArray(excludes) ? excludes : [];
        const itinerary = await prisma.guideItinerary.update({
            where: { id: itineraryId },
            data: updateData,
        });
        res.json({
            success: true,
            data: { itinerary },
        });
    }
    catch (error) {
        console.error('Update itinerary error:', error);
        res.status(500).json({ success: false, error: 'Failed to update itinerary' });
    }
}
/**
 * POST /api/guides/itineraries/:id/cover-image - Upload cover image
 * Accepts multipart/form-data with field coverImage
 */
export async function uploadItineraryCoverImage(req, res) {
    try {
        const guideId = req.user?.guideId;
        const itineraryId = String(req.params.id || '');
        if (!guideId) {
            res.status(401).json({ success: false, error: 'Not authenticated as guide' });
            return;
        }
        if (!req.file) {
            res.status(400).json({ success: false, error: 'No file uploaded. Use field name: coverImage' });
            return;
        }
        const existing = await prisma.guideItinerary.findFirst({
            where: { id: itineraryId, guideId },
        });
        if (!existing) {
            res.status(404).json({ success: false, error: 'Itinerary not found' });
            return;
        }
        const apiBase = process.env.API_BASE_URL || 'https://api.bucketlist.sa';
        const coverImageUrl = `${apiBase}/uploads/tours/${req.file.filename}`;
        await prisma.guideItinerary.update({
            where: { id: itineraryId },
            data: { coverImage: coverImageUrl },
        });
        res.json({
            success: true,
            data: { coverImageUrl },
        });
    }
    catch (error) {
        console.error('Upload cover image error:', error);
        res.status(500).json({ success: false, error: 'Failed to upload cover image' });
    }
}
/**
 * DELETE /api/guides/itineraries/:id - Delete itinerary
 */
export async function deleteItinerary(req, res) {
    try {
        const guideId = req.user?.guideId;
        const itineraryId = String(req.params.id || '');
        if (!guideId) {
            res.status(401).json({ success: false, error: 'Not authenticated as guide' });
            return;
        }
        const existing = await prisma.guideItinerary.findFirst({
            where: { id: itineraryId, guideId },
        });
        if (!existing) {
            res.status(404).json({ success: false, error: 'Itinerary not found' });
            return;
        }
        await prisma.guideItinerary.delete({
            where: { id: itineraryId },
        });
        res.json({
            success: true,
            message: 'Itinerary deleted',
        });
    }
    catch (error) {
        console.error('Delete itinerary error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete itinerary' });
    }
}
/**
 * POST /api/guides/profile-picture - Upload profile picture
 */
export async function uploadProfilePicture(req, res) {
    try {
        const guideId = req.user?.guideId;
        if (!guideId) {
            res.status(401).json({ success: false, error: 'Not authenticated as guide' });
            return;
        }
        if (!req.file) {
            res.status(400).json({ success: false, error: 'No file uploaded' });
            return;
        }
        const profilePictureUrl = `/uploads/profile-pictures/${req.file.filename}`;
        const guide = await prisma.guide.update({
            where: { id: guideId },
            data: { profilePictureUrl },
            select: {
                id: true, fullName: true, email: true, phone: true,
                licenseNumber: true, licenseStatus: true, location: true,
                profilePictureUrl: true, bio: true, languages: true,
                specialties: true, rating: true, hourlyRate: true,
            },
        });
        res.json({ success: true, data: { guide } });
    }
    catch (error) {
        console.error('Upload profile picture error:', error);
        res.status(500).json({ success: false, error: 'Failed to upload profile picture' });
    }
}
/**
 * POST /api/guides/forgot-password - Send password reset code via email
 */
export async function forgotPassword(req, res) {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ success: false, error: 'Email is required' });
            return;
        }
        const user = await prisma.user.findUnique({ where: { email } });
        // Always return success to prevent email enumeration
        if (!user) {
            res.json({ success: true, message: 'If an account exists, a reset code has been sent' });
            return;
        }
        // Generate 6-digit code
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const resetExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        await prisma.user.update({
            where: { email },
            data: { resetCode, resetCodeExpiry: resetExpiry },
        });
        // Send email via Resend
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
            from: 'Bucket List Guides <noreply@bucketlist.sa>',
            to: email,
            subject: 'Password Reset Code',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a;">Reset Your Password</h2>
          <p>Your password reset code is:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">${resetCode}</span>
          </div>
          <p style="color: #666;">This code expires in 15 minutes.</p>
          <p style="color: #666;">If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">The Bucket List Company</p>
        </div>
      `,
        });
        res.json({ success: true, message: 'If an account exists, a reset code has been sent' });
    }
    catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ success: false, error: 'Failed to process request' });
    }
}
/**
 * POST /api/guides/reset-password - Reset password with code
 */
export async function resetPassword(req, res) {
    try {
        const { email, code, newPassword } = req.body;
        if (!email || !code || !newPassword) {
            res.status(400).json({ success: false, error: 'Email, code, and new password are required' });
            return;
        }
        if (newPassword.length < 8) {
            res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
            return;
        }
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.resetCode !== code || !user.resetCodeExpiry || user.resetCodeExpiry < new Date()) {
            res.status(400).json({ success: false, error: 'Invalid or expired reset code' });
            return;
        }
        const hashedPassword = await hashPassword(newPassword);
        await prisma.user.update({
            where: { email },
            data: { passwordHash: hashedPassword, resetCode: null, resetCodeExpiry: null },
        });
        res.json({ success: true, message: 'Password reset successfully' });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, error: 'Failed to reset password' });
    }
}
