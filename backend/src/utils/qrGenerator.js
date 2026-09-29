/**
 * QR Code Generator Utility
 * Generates Data URL QR code for e-tickets
 */

const QRCode = require('qrcode');

/**
 * Generate QR code as Base64 Data URL
 * @param {string} text - Content to encode in QR
 * @returns {Promise<string>} - Base64 Data URL
 */
async function generateQRCode(text) {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 1,
      width: 256
    });
  } catch (err) {
    throw new Error(`Failed to generate QR code: ${err.message}`);
  }
}

module.exports = { generateQRCode };
