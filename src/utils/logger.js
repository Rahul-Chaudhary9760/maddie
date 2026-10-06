/**
 * Logger Utility
 * Provides colored, timestamped, leveled console logging for debugging and production monitoring.
 * Masks sensitive fields (passwords, tokens) to prevent security leaks.
 */

// ANSI Color codes for clean terminal output
const COLORS = {
    reset: '\x1b[0m',
    dim: '\x1b[2m',
    bright: '\x1b[1m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    magenta: '\x1b[35m',
    blue: '\x1b[34m',
    gray: '\x1b[90m'
};

const SENSITIVE_KEYS = new Set(['password', 'accessToken', 'refreshToken', 'token', 'authorization']);

/**
 * Recursively masks sensitive fields in objects for safe logging
 */
const sanitizeData = (data) => {
    if (!data || typeof data !== 'object') return data;
    if (Array.isArray(data)) return data.map(sanitizeData);

    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
        if (SENSITIVE_KEYS.has(key.toLowerCase())) {
            sanitized[key] = '***MASKED***';
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeData(value);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
};

const getTimestamp = () => {
    const now = new Date();
    return now.toISOString().replace('T', ' ').substring(0, 19);
};

const formatMeta = (meta) => {
    if (!meta) return '';
    if (meta instanceof Error) {
        return `\n${COLORS.red}${meta.stack || meta.message}${COLORS.reset}`;
    }
    if (typeof meta === 'object') {
        try {
            const clean = sanitizeData(meta);
            return ` ${COLORS.dim}${JSON.stringify(clean)}${COLORS.reset}`;
        } catch {
            return ` [Object]`;
        }
    }
    return ` ${meta}`;
};

export const logger = {
    info: (message, meta) => {
        const time = `${COLORS.gray}[${getTimestamp()}]${COLORS.reset}`;
        const tag = `${COLORS.green}[INFO]${COLORS.reset}`;
        console.log(`${time} ${tag} ${message}${formatMeta(meta)}`);
    },

    warn: (message, meta) => {
        const time = `${COLORS.gray}[${getTimestamp()}]${COLORS.reset}`;
        const tag = `${COLORS.yellow}[WARN]${COLORS.reset}`;
        console.warn(`${time} ${tag} ${COLORS.yellow}${message}${COLORS.reset}${formatMeta(meta)}`);
    },

    error: (message, errorOrMeta) => {
        const time = `${COLORS.gray}[${getTimestamp()}]${COLORS.reset}`;
        const tag = `${COLORS.red}${COLORS.bright}[ERROR]${COLORS.reset}`;
        console.error(`${time} ${tag} ${COLORS.red}${message}${COLORS.reset}${formatMeta(errorOrMeta)}`);
    },

    debug: (message, meta) => {
        // Debug logs only appear in non-production environments
        if (process.env.NODE_ENV === 'production') return;
        const time = `${COLORS.gray}[${getTimestamp()}]${COLORS.reset}`;
        const tag = `${COLORS.magenta}[DEBUG]${COLORS.reset}`;
        console.log(`${time} ${tag} ${COLORS.magenta}${message}${COLORS.reset}${formatMeta(meta)}`);
    },

    http: (message, meta) => {
        const time = `${COLORS.gray}[${getTimestamp()}]${COLORS.reset}`;
        const tag = `${COLORS.cyan}[HTTP]${COLORS.reset}`;
        console.log(`${time} ${tag} ${message}${formatMeta(meta)}`);
    }
};

export default logger;
