import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * ONNX Runtime Web / Transformers.js compatibility
   *
   * • Alias out `onnxruntime-node` so webpack/turbopack never tries to bundle
   *   the native Node.js addon into the browser build.
   * • The COOP/COEP headers below enable SharedArrayBuffer which allows
   *   the multi-threaded WASM backend to be used by ONNX Runtime Web.
   *   (Falls back to single-threaded WASM automatically on older browsers.)
   */

  // Turbopack configuration (Next.js 16+ default dev bundler)
  turbopack: {
    resolveAlias: {
      "onnxruntime-node": { browser: "@huggingface/transformers" }, // redirect to browser-safe package
    },
  },

  // Webpack configuration (used for production builds)
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "onnxruntime-node$": false,
      "sharp$": false, // suppress sharp SSR warning from transformers.js
    };
    return config;
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;
