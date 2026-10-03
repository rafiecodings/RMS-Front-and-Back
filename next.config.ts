import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const rawBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();

if (isProduction && !rawBackendUrl) {
  throw new Error(
    "NEXT_PUBLIC_BACKEND_URL is required for production builds. Set it to the backend origin (e.g. https://api.your-domain.com) so /api/v1 and /storage rewrites can be generated at build time."
  );
}

const backendUrl = rawBackendUrl || "http://127.0.0.1:8000";

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
      {
        // Uploaded menu-item images are stored by the backend at /storage/*.
        // Proxy them through the frontend origin so relative image_url paths
        // render correctly without remote host config.
        source: "/storage/:path*",
        destination: `${backendUrl}/storage/:path*`,
      },
    ];
  },
  async headers() {
    // HSTS is only safe over HTTPS, so it is emitted for production builds
    // exclusively (plain-HTTP localhost development must keep working).
    return [
      {
        source: "/:path*",
        headers: isProduction
          ? [
              ...securityHeaders,
              {
                key: "Strict-Transport-Security",
                value: "max-age=31536000; includeSubDomains",
              },
            ]
          : securityHeaders,
      },
    ];
  },
};

export default nextConfig;
