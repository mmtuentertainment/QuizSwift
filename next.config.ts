import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow R2 public URL for question images
    // Uses env variable pattern matching for flexibility across environments
    remotePatterns: [
      // Cloudflare R2 public bucket URLs (pub-*.r2.dev)
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
      // Custom domain pointing to R2 (if configured)
      ...(process.env.NEXT_PUBLIC_R2_URL
        ? [
            {
              protocol: 'https' as const,
              hostname: new URL(process.env.NEXT_PUBLIC_R2_URL).hostname,
            },
          ]
        : []),
      // Cloudflare R2 storage URLs for presigned URLs
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
    ],
  },
};

export default nextConfig;
