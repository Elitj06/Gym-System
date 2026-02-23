import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Contar membros ativos
    const activeMembers = await prisma.member.count({
      where: { status: 'active' },
    })

    // Contar total de membros
    const totalMembers = await prisma.member.count()

    // Calcular receita mensal (soma dos planos ativos)
    const membersWithPlans = await prisma.member.findMany({
      where: { status: 'active' },
      include: { plan: true },
    })

    const monthlyRevenue = membersWithPlans.reduce((sum: number, member: any) => {
      return sum + Number(member.plan.price)
    }, 0)

    // Calcular taxa de retenção
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const membersLastMonth = await prisma.member.count({
      where: {
        enrollmentDate: {
          lte: thirtyDaysAgo,
        },
      },
    })

    const stillActiveFromLastMonth = await prisma.member.count({
      where: {
        enrollmentDate: {
          lte: thirtyDaysAgo,
        },
        status: 'active',
      },
    })

    const retentionRate = membersLastMonth > 0
      ? (stillActiveFromLastMonth / membersLastMonth) * 100
      : 0

    // Ocupação média (simulada por enquanto - será real com access logs)
    const recentAccessLogs = await prisma.accessLog.count({
      where: {
        checkIn: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    })

    // Assumindo capacidade máxima de 200 pessoas
    const averageOccupancy = Math.min((recentAccessLogs / 200) * 100, 100)

    // Distribuição de planos
    const planDistribution = await prisma.plan.findMany({
      where: { active: true },
      include: {
        _count: {
          select: { members: { where: { status: 'active' } } },
        },
      },
    })

    const plans = planDistribution.map((plan: any) => ({
      name: plan.name,
      count: plan._count.members,
      percentage: totalMembers > 0 ? (plan._count.members / totalMembers) * 100 : 0,
    }))

    // Receita vs Despesas (últimos 6 meses) - simulado por enquanto
    const revenueData = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short' })
      
      // Aqui você pode calcular receita real baseada em payments
      revenueData.push({
        month: monthName,
        revenue: monthlyRevenue * (0.85 + Math.random() * 0.3), // Variação simulada
        expenses: monthlyRevenue * (0.4 + Math.random() * 0.2), // Despesas simuladas
      })
    }

    // Atividades recentes
    const recentActivities = await prisma.member.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { plan: true },
    })

    const activities = recentActivities.map((member: any) => ({
      type: 'new_member',
      description: `Novo membro: ${member.name}`,
      time: member.createdAt,
      plan: member.plan.name,
    }))

    return NextResponse.json({
      kpis: {
        activeMembers,
        monthlyRevenue,
        retentionRate: retentionRate.toFixed(1),
        averageOccupancy: averageOccupancy.toFixed(1),
      },
      revenueData,
      plans,
      activities,
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
