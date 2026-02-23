import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/plans - Listar todos os planos
export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      where: {
        active: true,
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: {
        price: 'asc',
      },
    })

    return NextResponse.json(plans)
  } catch (error) {
    console.error('Error fetching plans:', error)
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    )
  }
}

// POST /api/plans - Criar novo plano
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const { name, price, duration, description } = body

    if (!name || !price || !duration) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const plan = await prisma.plan.create({
      data: {
        name,
        price,
        duration,
        description,
      },
    })

    return NextResponse.json(plan, { status: 201 })
  } catch (error) {
    console.error('Error creating plan:', error)
    return NextResponse.json(
      { error: 'Failed to create plan' },
      { status: 500 }
    )
  }
}
