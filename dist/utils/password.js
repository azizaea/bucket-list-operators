import bcrypt from 'bcryptjs';
/**
 * Hash a plain text password using bcrypt
 */
export async function hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}
/**
 * Compare a plain text password with a hashed password
 */
export async function comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
}
/**
 * Validate password strength
 */
export function validatePassword(password) {
    if (password.length < 8) {
        return {
            isValid: false,
            error: 'Password must be at least 8 characters long',
        };
    }
    if (!/\d/.test(password)) {
        return {
            isValid: false,
            error: 'Password must contain at least one number',
        };
    }
    if (!/[a-zA-Z]/.test(password)) {
        return {
            isValid: false,
            error: 'Password must contain at least one letter',
        };
    }
    return { isValid: true };
}
