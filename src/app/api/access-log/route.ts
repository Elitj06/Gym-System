import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')
    const limit = parseInt(searchParams.get('limit') || '20')
    const where: any = {}
    if (memberId) where.memberId = memberId

    const logs = await prisma.accessLog.findMany({
      where,
      include: {
        member: { select: { id: true, name: true, photoUrl: true, plan: { select: { name: true } } } }
      },
      orderBy: { checkIn: 'desc' },
      take: limit,
    })
    return NextResponse.json(logs)
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao buscar acessos', details: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { memberId, action, method = 'biometric', location = 'Entrada Principal' } = body

    if (!memberId || !action) {
      return NextResponse.json({ error: 'memberId e action são obrigatórios' }, { status: 400 })
    }

    const member = await prisma.member.findUnique({ where: { id: memberId }, include: { plan: true } })
    if (!member) return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 })
    if (member.status !== 'active') {
      return NextResponse.json({ error: 'Matrícula inativa. Regularize sua situação na recepção.' }, { status: 403 })
    }

    if (action === 'check-in') {
      const open = await prisma.accessLog.findFirst({ where: { memberId, checkOut: null } })
      if (open) return NextResponse.json({ error: 'Membro já está na academia (check-in aberto).' }, { status: 400 })
      const log = await prisma.accessLog.create({
        data: { memberId, method, location },
        include: { member: { select: { id: true, name: true } } }
      })
      return NextResponse.json({ success: true, message: `Bem-vindo, ${member.name}! Boa aula! 💪`, log, member })
    }

    if (action === 'check-out') {
      const open = await prisma.accessLog.findFirst({ where: { memberId, checkOut: null }, orderBy: { checkIn: 'desc' } })
      if (!open) return NextResponse.json({ error: 'Nenhum check-in aberto encontrado.' }, { status: 404 })
      const now = new Date()
      const mins = Math.round((now.getTime() - open.checkIn.getTime()) / 60000)
      const log = await prisma.accessLog.update({ where: { id: open.id }, data: { checkOut: now } })
      return NextResponse.json({ success: true, message: `Até logo, ${member.name}! Treinou por ${mins} minutos.`, log, member })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao registrar acesso', details: error.message }, { status: 500 })
  }
}
