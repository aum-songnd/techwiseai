import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "cdn.pico.vn",
      },
       {
        protocol: "https",
        hostname: "scontent.fhan5-10.fna.fbcdn.net",
      },
      
    ],
  },
};

export default nextConfig;
