import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
    try {
        // 1. KPI Base
        const activeMembersCount = await prisma.member.count({ where: { status: 'active' } })
        const totalEquipments = await prisma.equipment.count()
        const maintenanceEquipments = await prisma.equipment.count({ where: { status: 'maintenance' } })

        // 2. Receita e Crescimento
        const today = new Date()
        const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)

        const paymentsThisMonth = await prisma.payment.findMany({
            where: {
                paidAt: { gte: startOfThisMonth },
                status: 'paid'
            }
        })

        const paymentsLastMonth = await prisma.payment.findMany({
            where: {
                paidAt: { gte: startOfLastMonth, lt: startOfThisMonth },
                status: 'paid'
            }
        })

        const receitaMensal = paymentsThisMonth.reduce((acc, curr) => acc + Number(curr.amount), 0)
        const receitaAnterior = paymentsLastMonth.reduce((acc, curr) => acc + Number(curr.amount), 0)
        const trendReceita = receitaAnterior === 0 ? 100 : ((receitaMensal - receitaAnterior) / receitaAnterior) * 100

        // 3. Distribuição de Planos (Para o Gráfico de Pizza)
        const plansInfo = await prisma.member.groupBy({
            by: ['planId'],
            _count: { id: true },
            where: { status: 'active' }
        })

        // Buscar os nomes reais dos planos
        const planDetails = await prisma.plan.findMany()
        const planDistribution = plansInfo.map(info => {
            const p = planDetails.find(pl => pl.id === info.planId)
            return {
                name: p?.name || 'Desconhecido',
                value: info._count.id
            }
        }).filter(d => d.value > 0)

        // Estruturando o JSON para os gráficos e cards
        return NextResponse.json({
            kpis: {
                activeMembers: activeMembersCount,
                receitaMensal: receitaMensal,
                trendReceita: trendReceita.toFixed(1),
                equipamentosManutencao: maintenanceEquipments,
                taxaRetencao: 92.4 // mock temporário ou calcular via logs futuramente
            },
            planDistribution
        })
    } catch (error) {
        console.error('Erro Analytics:', error)
        return NextResponse.json({ error: 'Erro interno ao processar analytics' }, { status: 500 })
    }
}
