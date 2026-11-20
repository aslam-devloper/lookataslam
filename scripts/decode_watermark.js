// decode_watermark.js — Forensic Anti-Piracy Decoder for lookataslam
// Usage: node decode_watermark.js "paste suspected text here"
// or pipe text into it: cat leaked.txt | node decode_watermark.js

const fs = require('fs');

const ZWJ  = '\u200D'; // 1
const ZWNJ = '\u200C'; // 0
const SEP  = '\u200B'; // separator

function decodeZeroWidth(text) {
  if (!text) return null;
  const parts = text.split(SEP).filter(p => p.length === 8);
  if (!parts || parts.length === 0) return null;

  let decoded = '';
  for (const part of parts) {
    let byte = 0;
    let isValid = true;
    for (let i = 0; i < 8; i++) {
      if (part[i] === ZWJ) {
        byte = (byte << 1) | 1;
      } else if (part[i] === ZWNJ) {
        byte = (byte << 1) | 0;
      } else {
        isValid = false;
        break;
      }
    }
    if (isValid && byte >= 32 && byte <= 126) {
      decoded += String.fromCharCode(byte);
    }
  }

  // Look for payment ID patterns (e.g., pay_XXXXX)
  const match = decoded.match(/pay_[A-Za-z0-9_]+/);
  return match ? match[0] : (decoded.length > 0 ? decoded : null);
}

// Read input from CLI argument or stdin
let input = process.argv.slice(2).join(' ');

if (!input) {
  try {
    input = fs.readFileSync(0, 'utf-8');
  } catch (e) {
    // Stdin empty
  }
}

if (!input) {
  console.log('--- lookataslam Forensic Watermark Decoder ---');
  console.log('Usage: node decode_watermark.js "pasted chapter text"');
  console.log('Or:    Get-Content leaked.txt | node decode_watermark.js\n');
  process.exit(0);
}

const found = decodeZeroWidth(input);
if (found) {
  console.log('\n========================================');
  console.log('🚨 FORENSIC WATERMARK DETECTED!');
  console.log('Razorpay Payment ID:', found);
  console.log('Action: Look up this Payment ID in your Razorpay Dashboard to retrieve the purchaser name, email, and billing details.');
  console.log('========================================\n');
} else {
  console.log('\n[!] No forensic watermark detected in the provided text.\n');
}
