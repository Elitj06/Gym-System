import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const employees = await prisma.employee.findMany({
            orderBy: { name: 'asc' }
        })

        return NextResponse.json(employees)
    } catch (error) {
        console.error('Erro ao buscar funcionários:', error)
        return NextResponse.json({ error: 'Erro ao buscar funcionários' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, email, cpf, phone, birthDate, role, salary, hireDate } = body

        if (!name || !email || !cpf || !role) {
            return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
        }

        const employee = await prisma.employee.create({
            data: {
                name,
                email,
                cpf,
                phone: phone || '',
                birthDate: new Date(birthDate || new Date()),
                role,
                salary: parseFloat(salary || 0),
                hireDate: new Date(hireDate || new Date())
            }
        })
        return NextResponse.json(employee, { status: 201 })
    } catch (error) {
        console.error('Erro ao criar funcionário:', error)
        return NextResponse.json({ error: 'Erro ao criar funcionário' }, { status: 500 })
    }
}
