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
      ...(() => {
        if (!process.env.NEXT_PUBLIC_R2_URL) return [];
        try {
          // Normalize URL: add https:// if no scheme present
          const urlStr = process.env.NEXT_PUBLIC_R2_URL.includes('://')
            ? process.env.NEXT_PUBLIC_R2_URL
            : `https://${process.env.NEXT_PUBLIC_R2_URL}`;
          return [
            {
              protocol: 'https' as const,
              hostname: new URL(urlStr).hostname,
            },
          ];
        } catch {
          console.warn('Invalid NEXT_PUBLIC_R2_URL, skipping custom domain pattern');
          return [];
        }
      })(),
      // Cloudflare R2 storage URLs for presigned URLs
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
    ],
  },
};

export default nextConfig;
