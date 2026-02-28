import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const schedules = await prisma.schedule.findMany({
            include: {
                instructor: {
                    select: { name: true }
                }
            },
            orderBy: [
                { dayOfWeek: 'asc' },
                { startTime: 'asc' }
            ]
        })

        return NextResponse.json(schedules)
    } catch (error) {
        console.error('Erro ao buscar treinos e horários:', error)
        return NextResponse.json({ error: 'Erro ao carregar agenda' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, description, instructorId, dayOfWeek, startTime, endTime, maxCapacity, location } = body

        if (!name || !instructorId || dayOfWeek === undefined || !startTime || !endTime) {
            return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
        }

        const schedule = await prisma.schedule.create({
            data: {
                name,
                description,
                instructorId,
                dayOfWeek: parseInt(dayOfWeek),
                startTime,
                endTime,
                maxCapacity: parseInt(maxCapacity || '20'),
                location: location || 'Área Principal',
                active: true
            }
        })

        return NextResponse.json(schedule, { status: 201 })
    } catch (error) {
        console.error('Erro ao criar treino:', error)
        return NextResponse.json({ error: 'Erro interno ao salvar treino' }, { status: 500 })
    }
}
