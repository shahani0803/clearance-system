const crypto = require('crypto');

/**
 * Generates a SHA-256 hash from a given string.
 * @param {string} data - The string to hash.
 * @returns {string} The resulting SHA-256 hash in hexadecimal.
 */
function generateSHA256(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

module.exports = generateSHA256;
