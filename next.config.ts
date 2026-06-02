import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Exercise images served from the free-exercise-db dataset.
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/yuhonas/free-exercise-db/**",
      },
      {
        // Allow user-uploaded images stored in Supabase Storage.
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
