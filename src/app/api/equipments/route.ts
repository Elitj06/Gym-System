import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
    try {
        const equipments = await prisma.equipment.findMany({
            include: {
                maintenances: {
                    orderBy: { date: 'desc' },
                    take: 1
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        // Transformar para o formato esperado pelo frontend
        const formattedEquipments = equipments.map(eq => {
            const last = eq.maintenances[0]
            return {
                id: eq.id,
                name: eq.name,
                area: eq.area,
                status: eq.status,
                lastMaint: last ? last.date.toLocaleDateString('pt-BR') : 'Sem registro',
                nextMaint: last?.nextDate ? last.nextDate.toLocaleDateString('pt-BR') : 'Não agendado',
            }
        })

        return NextResponse.json(formattedEquipments)
    } catch (error) {
        console.error('Erro ao buscar equipamentos:', error)
        return NextResponse.json({ error: 'Erro ao buscar equipamentos' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const equipment = await prisma.equipment.create({
            data: {
                name: body.name,
                area: body.area,
                status: body.status || 'active'
            }
        })
        return NextResponse.json(equipment)
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao criar equipamento' }, { status: 500 })
    }
}
