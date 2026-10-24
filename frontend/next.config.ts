import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
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

      {
        protocol: "https",
        hostname: "talkingtechandaudio.com",
      },
      {
        protocol: "https",
        hostname: "images2.thanhnien.vn",
      },
      {
        protocol: "https",
        hostname: "cdn.tgdd.vn",
      },
      {
        protocol: "https",
        hostname: "images.openai.com",
      },
      {
        protocol: "https",
        hostname: "i1-vnexpress.vnecdn.net",
      },
      {
        protocol: "https",
        hostname: "cdn-media.sforum.vn",
      },
      {
        protocol: "https",
        hostname: "maytinhcdc.vn",
      },
      {
        protocol: "https",
        hostname: "cafefcdn.com",
      },
      {
        protocol: "https",
        hostname: "cellphones.com.vn",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/login",
        destination: "/sign-in",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
//    NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1