import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Obter scores de todos os funcionários ou de um específico
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')

    if (employeeId) {
      // Score de um funcionário específico
      const score = await prisma.employeeScore.findUnique({
        where: { employeeId },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
              role: true,
              email: true,
            }
          }
        }
      })

      if (!score) {
        return NextResponse.json(
          { error: 'Score não encontrado' },
          { status: 404 }
        )
      }

      return NextResponse.json(score)
    } else {
      // Scores de todos os funcionários (ranking)
      const scores = await prisma.employeeScore.findMany({
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
              role: true,
            }
          }
        },
        orderBy: { overallScore: 'desc' },
      })

      return NextResponse.json(scores)
    }
  } catch (error: any) {
    console.error('Erro ao buscar scores:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar scores', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Atualizar score de atendimento ao cliente
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { employeeId, customerServiceScore } = body

    if (!employeeId || customerServiceScore === undefined) {
      return NextResponse.json(
        { error: 'employeeId e customerServiceScore são obrigatórios' },
        { status: 400 }
      )
    }

    if (customerServiceScore < 0 || customerServiceScore > 100) {
      return NextResponse.json(
        { error: 'Score deve estar entre 0 e 100' },
        { status: 400 }
      )
    }

    // Buscar ou criar score
    let score = await prisma.employeeScore.findUnique({
      where: { employeeId }
    })

    if (!score) {
      score = await prisma.employeeScore.create({
        data: { 
          employeeId,
          customerServiceScore,
        }
      })
    }

    // Recalcular score geral
    const overallScore = (
      score.punctualityScore * 0.4 +
      customerServiceScore * 0.3 +
      score.hoursScore * 0.3
    )

    // Atualizar
    const updatedScore = await prisma.employeeScore.update({
      where: { employeeId },
      data: {
        customerServiceScore,
        overallScore,
        lastEvaluatedAt: new Date(),
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Score de atendimento atualizado',
      score: updatedScore,
    })

  } catch (error: any) {
    console.error('Erro ao atualizar score:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar score', details: error.message },
      { status: 500 }
    )
  }
}

// PUT - Resetar scores (útil para novo período de avaliação)
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { employeeId, resetType } = body // 'all' ou 'stats'

    if (!employeeId) {
      return NextResponse.json(
        { error: 'employeeId é obrigatório' },
        { status: 400 }
      )
    }

    const updateData: any = {
      lastEvaluatedAt: new Date(),
    }

    if (resetType === 'stats') {
      // Resetar apenas estatísticas, manter scores
      updateData.totalDaysWorked = 0
      updateData.totalLateArrivals = 0
      updateData.totalEarlyLeaves = 0
      updateData.totalAbsences = 0
      updateData.totalHoursWorked = 0
    } else {
      // Resetar tudo
      updateData.punctualityScore = 100
      updateData.customerServiceScore = 100
      updateData.hoursScore = 100
      updateData.overallScore = 100
      updateData.totalDaysWorked = 0
      updateData.totalLateArrivals = 0
      updateData.totalEarlyLeaves = 0
      updateData.totalAbsences = 0
      updateData.totalHoursWorked = 0
    }

    const updatedScore = await prisma.employeeScore.update({
      where: { employeeId },
      data: updateData,
      include: {
        employee: {
          select: {
            name: true,
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Scores ${resetType === 'stats' ? 'e estatísticas' : ''} resetados`,
      score: updatedScore,
    })

  } catch (error: any) {
    console.error('Erro ao resetar score:', error)
    return NextResponse.json(
      { error: 'Erro ao resetar score', details: error.message },
      { status: 500 }
    )
  }
}
