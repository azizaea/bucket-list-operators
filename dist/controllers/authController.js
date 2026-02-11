import { PrismaClient } from '@prisma/client';
import { hashPassword, comparePassword, validatePassword } from '../utils/password.js';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.js';
const prisma = new PrismaClient();
/**
 * Register new operator and create admin user
 */
export async function register(req, res) {
    try {
        const { email, password, companyNameEn, companyNameAr, licenseNumber, phone, } = req.body;
        // Validate required fields
        if (!email || !password || !companyNameEn || !licenseNumber) {
            res.status(400).json({
                success: false,
                error: 'Missing required fields: email, password, companyNameEn, licenseNumber',
            });
            return;
        }
        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            res.status(400).json({
                success: false,
                error: passwordValidation.error,
            });
            return;
        }
        // Check if email already exists
        const existingUser = await prisma.operatorUser.findUnique({
            where: { email },
        });
        if (existingUser) {
            res.status(400).json({
                success: false,
                error: 'Email already registered',
            });
            return;
        }
        // Hash password
        const passwordHash = await hashPassword(password);
        // Create operator and admin user in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create operator (Prisma uses camelCase field names)
            const operator = await tx.operator.create({
                data: {
                    companyNameEn,
                    companyNameAr: companyNameAr || companyNameEn,
                    licenseNumber,
                    email,
                    phone: phone || '',
                    subscriptionPlan: 'starter',
                    subscriptionStatus: 'trial',
                },
            });
            // Create admin user
            const user = await tx.operatorUser.create({
                data: {
                    operatorId: operator.id,
                    email,
                    passwordHash,
                    role: 'admin',
                    isActive: true,
                },
            });
            return { operator, user };
        });
        // Generate JWT tokens
        const tokens = generateTokens({
            userId: result.user.id,
            operatorId: result.operator.id,
            email: result.user.email,
            role: result.user.role,
        });
        res.status(201).json({
            success: true,
            data: {
                user: {
                    id: result.user.id,
                    email: result.user.email,
                    role: result.user.role,
                    operatorId: result.operator.id,
                    companyName: result.operator.companyNameEn,
                },
                tokens,
            },
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Registration failed',
        });
    }
}
/**
 * Login existing user
 */
export async function login(req, res) {
    try {
        const { email, password } = req.body;
        // Validate required fields
        if (!email || !password) {
            res.status(400).json({
                success: false,
                error: 'Email and password are required',
            });
            return;
        }
        // Find user by email
        const user = await prisma.operatorUser.findUnique({
            where: { email },
            include: {
                operator: true,
            },
        });
        if (!user) {
            res.status(401).json({
                success: false,
                error: 'Invalid email or password',
            });
            return;
        }
        // Check if user is active
        if (!user.isActive) {
            res.status(401).json({
                success: false,
                error: 'Account is deactivated',
            });
            return;
        }
        // Compare password
        const isPasswordValid = await comparePassword(password, user.passwordHash);
        if (!isPasswordValid) {
            res.status(401).json({
                success: false,
                error: 'Invalid email or password',
            });
            return;
        }
        // Generate JWT tokens
        const tokens = generateTokens({
            userId: user.id,
            operatorId: user.operatorId,
            email: user.email,
            role: user.role,
        });
        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    operatorId: user.operatorId,
                    companyName: user.operator.companyNameEn,
                },
                tokens,
            },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed',
        });
    }
}
/**
 * Refresh access token using refresh token
 */
export async function refreshToken(req, res) {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            res.status(400).json({
                success: false,
                error: 'Refresh token is required',
            });
            return;
        }
        // Verify refresh token
        const decoded = verifyRefreshToken(refreshToken);
        // Verify user still exists and is active
        const user = await prisma.operatorUser.findUnique({
            where: { id: decoded.userId },
        });
        if (!user || !user.isActive) {
            res.status(401).json({
                success: false,
                error: 'User not found or inactive',
            });
            return;
        }
        // Generate new tokens
        const tokens = generateTokens({
            userId: decoded.userId,
            operatorId: decoded.operatorId,
            email: decoded.email,
            role: decoded.role,
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
 * Get current user info
 */
export async function me(req, res) {
    try {
        const authReq = req;
        const userId = authReq.user?.userId;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: 'Not authenticated',
            });
            return;
        }
        const user = await prisma.operatorUser.findUnique({
            where: { id: userId },
            include: {
                operator: true,
            },
        });
        if (!user) {
            res.status(404).json({
                success: false,
                error: 'User not found',
            });
            return;
        }
        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    operatorId: user.operatorId,
                    companyName: user.operator.companyNameEn,
                    subscriptionPlan: user.operator.subscriptionPlan,
                    subscriptionStatus: user.operator.subscriptionStatus,
                },
            },
        });
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user info',
        });
    }
}
