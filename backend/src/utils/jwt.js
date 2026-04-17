const jwt = require('jsonwebtoken');

const ACCESS_SECRET  = process.env.JWT_SECRET          || 'dev_access_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET  || 'dev_refresh_secret';
const ACCESS_EXPIRY  = process.env.JWT_EXPIRES_IN      || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

function refreshTokenExpiresAt() {
  const ms = parseDuration(REFRESH_EXPIRY);
  return new Date(Date.now() + ms);
}

function parseDuration(str) {
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 86400000;
  return parseInt(match[1]) * units[match[2]];
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken, refreshTokenExpiresAt };