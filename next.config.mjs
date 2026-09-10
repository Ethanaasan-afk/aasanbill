/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disables ESLint errors during production builds on Vercel
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
