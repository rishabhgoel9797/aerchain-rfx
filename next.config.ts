import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the Next.js "N" developer badge (bottom-left) so it never covers the app during demos.
  devIndicators: false,
  // Native module used to draw PDF pages as pictures in the file viewer.
  serverExternalPackages: ["@napi-rs/canvas"],
};

export default nextConfig;
