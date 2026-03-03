/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Pacotes mediapipe são carregados via CDN no client-side,
      // não devem ser incluídos no bundle serverless
      const externals = [
        '@mediapipe/pose',
        '@mediapipe/face_detection',
        '@mediapipe/face_mesh',
        '@mediapipe/camera_utils',
        '@mediapipe/drawing_utils',
      ]
      externals.forEach(pkg => {
        if (Array.isArray(config.externals)) {
          config.externals.push(pkg)
        }
      })
    }
    return config
  },
}

module.exports = nextConfig
