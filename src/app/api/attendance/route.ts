import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Listar registros de ponto
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}
    
    if (employeeId) {
      where.employeeId = employeeId
    }

    if (startDate && endDate) {
      where.checkIn = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const attendances = await prisma.attendance.findMany({
      where,
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
      orderBy: { checkIn: 'desc' },
      take: 100,
    })

    return NextResponse.json(attendances)
  } catch (error: any) {
    console.error('Erro ao buscar attendances:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar registros de ponto', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Registrar ponto (check-in ou check-out)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      employeeId, 
      action, // 'check-in' ou 'check-out'
      faceConfidence,
      faceImageUrl,
      location 
    } = body

    if (!employeeId || !action) {
      return NextResponse.json(
        { error: 'employeeId e action são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se funcionário existe
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Funcionário não encontrado' },
        { status: 404 }
      )
    }

    if (action === 'check-in') {
      // Verificar se já tem check-in aberto
      const openAttendance = await prisma.attendance.findFirst({
        where: {
          employeeId,
          checkOut: null,
        }
      })

      if (openAttendance) {
        return NextResponse.json(
          { error: 'Funcionário já registrou entrada. Faça o check-out primeiro.' },
          { status: 400 }
        )
      }

      // Calcular se está atrasado (exemplo: entrada às 8:00)
      const now = new Date()
      const expectedTime = new Date(now)
      expectedTime.setHours(8, 0, 0, 0)

      const isLate = now > expectedTime
      const minutesLate = isLate 
        ? Math.floor((now.getTime() - expectedTime.getTime()) / 60000)
        : 0

      // Criar registro de check-in
      const attendance = await prisma.attendance.create({
        data: {
          employeeId,
          checkIn: now,
          faceConfidence,
          faceImageUrl,
          location,
          isLate,
          minutesLate: minutesLate > 0 ? minutesLate : null,
          status: isLate ? 'late' : 'present',
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

      // Atualizar score se estava atrasado
      if (isLate) {
        await updateEmployeeScore(employeeId, 'late')
      }

      return NextResponse.json({ 
        success: true, 
        message: isLate ? `Check-in registrado (${minutesLate}min de atraso)` : 'Check-in registrado com sucesso',
        attendance 
      })

    } else if (action === 'check-out') {
      // Buscar o último check-in sem check-out
      const attendance = await prisma.attendance.findFirst({
        where: {
          employeeId,
          checkOut: null,
        },
        orderBy: { checkIn: 'desc' }
      })

      if (!attendance) {
        return NextResponse.json(
          { error: 'Nenhum check-in aberto encontrado' },
          { status: 404 }
        )
      }

      const now = new Date()
      const hoursWorked = (now.getTime() - attendance.checkIn.getTime()) / (1000 * 60 * 60)

      // Atualizar com check-out
      const updatedAttendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          checkOut: now,
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

      // Atualizar horas trabalhadas no score
      await updateEmployeeScore(employeeId, 'hours', hoursWorked)

      return NextResponse.json({ 
        success: true, 
        message: `Check-out registrado (${hoursWorked.toFixed(2)}h trabalhadas)`,
        attendance: updatedAttendance 
      })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })

  } catch (error: any) {
    console.error('Erro ao registrar ponto:', error)
    return NextResponse.json(
      { error: 'Erro ao registrar ponto', details: error.message },
      { status: 500 }
    )
  }
}

// Função auxiliar para atualizar score do funcionário
async function updateEmployeeScore(
  employeeId: string, 
  type: 'late' | 'hours' | 'customer',
  value?: number
) {
  try {
    // Buscar ou criar score
    let score = await prisma.employeeScore.findUnique({
      where: { employeeId }
    })

    if (!score) {
      score = await prisma.employeeScore.create({
        data: { employeeId }
      })
    }

    const updates: any = { lastEvaluatedAt: new Date() }

    if (type === 'late') {
      updates.totalLateArrivals = { increment: 1 }
      // Reduzir score de pontualidade (máx -2 por atraso)
      updates.punctualityScore = Math.max(0, score.punctualityScore - 2)
    } else if (type === 'hours' && value) {
      updates.totalHoursWorked = { increment: value }
      updates.totalDaysWorked = { increment: 1 }
      
      // Avaliar horas trabalhadas (esperado: 8h/dia)
      const expectedHours = 8
      const hoursRatio = value / expectedHours
      const hoursScoreChange = hoursRatio >= 1 ? 0 : (hoursRatio - 1) * 5
      updates.hoursScore = Math.max(0, Math.min(100, score.hoursScore + hoursScoreChange))
    }

    // Recalcular score geral (média ponderada)
    const newPunctualityScore = updates.punctualityScore ?? score.punctualityScore
    const newHoursScore = updates.hoursScore ?? score.hoursScore
    const customerScore = score.customerServiceScore

    updates.overallScore = (
      newPunctualityScore * 0.4 +  // 40% pontualidade
      customerScore * 0.3 +          // 30% atendimento
      newHoursScore * 0.3            // 30% horas trabalhadas
    )

    await prisma.employeeScore.update({
      where: { employeeId },
      data: updates,
    })
  } catch (error) {
    console.error('Erro ao atualizar score:', error)
  }
}
