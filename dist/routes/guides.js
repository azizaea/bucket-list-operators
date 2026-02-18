import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { registerGuide, loginGuide, refreshGuideToken, getGuideProfile, updateGuideProfile, uploadLicensePhoto, uploadProfilePicture, forgotPassword, resetPassword, getGuideById, listGuides, getGuideAvailability, createItinerary, getGuideItineraries, updateItinerary, deleteItinerary, } from '../controllers/guideController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
const router = Router();
// ============ PUBLIC (no auth) ============
router.post('/register', registerGuide);
router.post('/login', loginGuide);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh', refreshGuideToken);
// ============ GUIDE PROTECTED (role: guide) ============
router.get('/profile', authMiddleware, requireRole('guide'), getGuideProfile);
router.put('/profile', authMiddleware, requireRole('guide'), updateGuideProfile);
router.post('/license-photo', authMiddleware, requireRole('guide'), uploadLicensePhoto);
// Itineraries (guide only)
router.post('/itineraries', authMiddleware, requireRole('guide'), createItinerary);
router.get('/itineraries', authMiddleware, requireRole('guide'), getGuideItineraries);
router.put('/itineraries/:id', authMiddleware, requireRole('guide'), updateItinerary);
router.delete('/itineraries/:id', authMiddleware, requireRole('guide'), deleteItinerary);
// ============ OPERATOR PROTECTED (role: admin, staff, agent) ============
router.get('/', authMiddleware, requireRole('admin', 'staff', 'agent'), listGuides);
router.get('/:id', authMiddleware, requireRole('admin', 'staff', 'agent'), getGuideById);
router.get('/:id/availability', authMiddleware, requireRole('admin', 'staff', 'agent'), getGuideAvailability);
// Profile picture upload config
const storage = multer.diskStorage({
    destination: 'uploads/profile-pictures/',
    filename: (_req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
        cb(null, uniqueName);
    },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
router.post('/profile-picture', authMiddleware, requireRole('guide'), upload.single('profilePicture'), uploadProfilePicture);
export default router;
