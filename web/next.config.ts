import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // El snapshot vive en public/data y se lee en el servidor durante el build
  outputFileTracingIncludes: { "/**": ["./public/data/**/*"] },
};

export default nextConfig;
