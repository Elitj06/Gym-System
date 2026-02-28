import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const payments = await prisma.payment.findMany({
            include: {
                member: {
                    select: { name: true, cpf: true }
                }
            },
            orderBy: { dueDate: 'desc' }
        })

        // Obter estatísticas rápidas
        const totalRevenue = payments.reduce((acc, curr) => acc + Number(curr.amount), 0)
        const pendingAmount = payments.filter(p => p.status === 'pending').reduce((acc, curr) => acc + Number(curr.amount), 0)

        return NextResponse.json({
            payments,
            stats: { totalRevenue, pendingAmount }
        })
    } catch (error) {
        console.error('Erro ao buscar pagamentos:', error)
        return NextResponse.json({ error: 'Erro ao buscar pagamentos' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { memberId, amount, dueDate, status, method, notes } = body

        if (!memberId || !amount || !dueDate) {
            return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
        }

        const payment = await prisma.payment.create({
            data: {
                memberId,
                amount: parseFloat(amount),
                dueDate: new Date(dueDate),
                status: status || 'pending',
                method,
                notes,
                paidAt: status === 'paid' ? new Date() : null
            }
        })
        return NextResponse.json(payment, { status: 201 })
    } catch (error) {
        console.error('Erro ao criar pagamento:', error)
        return NextResponse.json({ error: 'Erro ao criar pagamento' }, { status: 500 })
    }
}
