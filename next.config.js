/** @type {import('next').NextConfig} */
const {applicationOrigin,sandboxMode} = require('./lib/deployment-config.cjs');
// Validate before compiling browser database settings or executing build-time routes.
applicationOrigin();
if (sandboxMode() && !/^[a-f0-9]{64}$/i.test(process.env.METRICOOL_OAUTH_ENCRYPTION_KEY || '')) {
  throw new Error('Sandbox OAuth encryption requires a 64-character hexadecimal key.');
}
const nextConfig = {};

module.exports = nextConfig;

