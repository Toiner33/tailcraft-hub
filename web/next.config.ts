import type { NextConfig } from 'next';

// Collect dev origins dynamically
const devOrigins = ['localhost:3000', '100.*.*.*'];

// If a private machine name is defined in .env.local, append it
if (process.env.MY_MACHINE_NAME) {
  devOrigins.push(process.env.MY_MACHINE_NAME);
}

const nextConfig: NextConfig = {
  allowedDevOrigins: devOrigins,
};

export default nextConfig;
