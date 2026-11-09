import type { NextConfig } from "next";

// Browser requests stay on the frontend origin. This is important for the
// HttpOnly session cookie: the browser stores/sends it as a first-party cookie
// instead of relying on third-party cookies between two vercel.app hosts.
const apiOrigin = (
  process.env.API_PROXY_ORIGIN ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:4100"
    : "https://sukoon-cafe-api.vercel.app")
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
