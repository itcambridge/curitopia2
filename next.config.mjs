import { readBasePath } from './lib/base-path.mjs'

const basePath = readBasePath(process.env.NEXT_PUBLIC_BASE_PATH)

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(basePath ? { basePath } : {}),
  images: {
    unoptimized: true,
  },
}

export default nextConfig
