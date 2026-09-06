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
       {
        protocol: "https",
        hostname: "cdn2.cellphones.com.vn",
      },
      
    ],
  },
};

export default nextConfig;
