import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Rotas protegidas
  const protectedRoutes = [
    '/dashboard',
    '/membros',
    '/funcionarios',
    '/treinos',
    '/financeiro',
    '/espacos',
    '/ia-vision',
    '/relatorios',
  ]
  
  // Verifica se a rota atual é protegida
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )
  
  if (!isProtectedRoute) {
    return NextResponse.next()
  }
  
  // Verifica se tem token de sessão
  const token = request.cookies.get('next-auth.session-token') || 
                request.cookies.get('__Secure-next-auth.session-token')
  
  if (!token) {
    const url = new URL('/login', request.url)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }
  
  return NextResponse.next()
}

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
