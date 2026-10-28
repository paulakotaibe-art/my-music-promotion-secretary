/** @type {import('next').NextConfig} */
const {applicationOrigin} = require('./lib/deployment-config.cjs');
// Validate before compiling browser database settings or executing build-time routes.
applicationOrigin();
const nextConfig = {};

module.exports = nextConfig;

