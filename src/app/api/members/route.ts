import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/members - Listar todos os membros
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const where: any = {}
    
    if (status) {
      where.status = status
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { cpf: { contains: search, mode: 'insensitive' } },
      ]
    }

    const members = await prisma.member.findMany({
      where,
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(members)
  } catch (error) {
    console.error('Error fetching members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    )
  }
}

// POST /api/members - Criar novo membro
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const {
      name,
      email,
      cpf,
      phone,
      birthDate,
      gender,
      planId,
      paymentDay,
      address,
      city,
      state,
      zipCode,
    } = body

    // Validações básicas
    if (!name || !email || !cpf || !phone || !birthDate || !planId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verificar se o email já existe
    const existingMemberEmail = await prisma.member.findUnique({
      where: { email },
    })

    if (existingMemberEmail) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }

    // Verificar se o CPF já existe
    const existingMemberCPF = await prisma.member.findUnique({
      where: { cpf },
    })

    if (existingMemberCPF) {
      return NextResponse.json(
        { error: 'CPF already registered' },
        { status: 409 }
      )
    }

    // Calcular nextPayment
    const now = new Date()
    const nextPayment = new Date(now.getFullYear(), now.getMonth(), paymentDay || 5)
    if (nextPayment < now) {
      nextPayment.setMonth(nextPayment.getMonth() + 1)
    }

    const member = await prisma.member.create({
      data: {
        name,
        email,
        cpf,
        phone,
        birthDate: new Date(birthDate),
        gender,
        planId,
        paymentDay: paymentDay || 5,
        nextPayment,
        address,
        city,
        state,
        zipCode,
      },
      include: {
        plan: true,
      },
    })

    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    console.error('Error creating member:', error)
    return NextResponse.json(
      { error: 'Failed to create member' },
      { status: 500 }
    )
  }
}
