/**
 * QR Code Generator Utility
 * Generates Base64 Data URL QR Code for Cinema E-Tickets
 */

const QRCode = require('qrcode');

/**
 * Generate QR code as Base64 Data URL string
 * @param {string} text - Payload to encode
 * @returns {Promise<string>} Base64 Data URL (image/png)
 */
async function generateQRCode(text) {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      margin: 1,
      width: 250,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch (err) {
    throw new Error(`QR generation failed: ${err.message}`);
  }
}

module.exports = {
  generateQRCode
};
