import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const email = 'carlos.silva@gym.com'
    const password = 'gym123'

    // 1. Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json({
        error: 'Usuário não encontrado',
        email
      }, { status: 404 })
    }

    // 2. Verificar campos
    const userInfo = {
      id: user.id,
      email: user.email,
      name: user.name,
      hasPassword: !!user.password,
      passwordPreview: user.password ? user.password.substring(0, 30) + '...' : null,
      hasRole: !!(user as any).role,
      role: (user as any).role || 'NOT_FOUND',
    }

    // 3. Testar bcrypt
    let isPasswordValid = false
    if (user.password) {
      isPasswordValid = await bcrypt.compare(password, user.password)
    }

    return NextResponse.json({
      success: true,
      userInfo,
      passwordTest: {
        tested: !!user.password,
        isValid: isPasswordValid,
        testedPassword: password
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Erro no debug',
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
