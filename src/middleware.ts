export { default } from "next-auth/middleware"

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/membros/:path*',
    '/funcionarios/:path*',
    '/treinos/:path*',
    '/financeiro/:path*',
    '/espacos/:path*',
    '/ia-vision/:path*',
    '/relatorios/:path*',
  ],
}
