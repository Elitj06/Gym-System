import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Este endpoint deve ser usado APENAS UMA VEZ para popular o banco em produção
// Depois de usar, delete este arquivo ou adicione autenticação robusta

export async function POST(request: Request) {
  try {
    // Log para debug
    console.log('📥 Recebendo requisição POST em /api/seed')
    
    // Proteção básica com senha
    const body = await request.json()
    console.log('📦 Body recebido:', { hasPassword: !!body.password })
    
    const { password } = body
    
    if (password !== 'GymSystem2026!') {
      console.log('❌ Senha incorreta')
      return NextResponse.json(
        { error: 'Unauthorized - Invalid password' },
        { status: 401 }
      )
    }

    console.log('✅ Senha correta')
    console.log('🔍 Verificando DATABASE_URL:', {
      exists: !!process.env.DATABASE_URL,
      length: process.env.DATABASE_URL?.length || 0
    })

    console.log('🌱 Starting database seed...')

    // Verificar se já foi executado
    console.log('🔍 Contando planos existentes...')
    const existingPlans = await prisma.plan.count()
    console.log(`📊 Planos encontrados: ${existingPlans}`)
    
    if (existingPlans > 0) {
      console.log('⚠️  Database already seeded')
      return NextResponse.json({
        message: 'Database already seeded',
        plans: existingPlans,
      })
    }

    // Criar planos
    const plans = await Promise.all([
      prisma.plan.create({
        data: {
          id: 'plan-mensal',
          name: 'Mensal',
          price: 89.90,
          duration: 30,
          description: 'Plano mensal com acesso completo à academia',
        },
      }),
      prisma.plan.create({
        data: {
          id: 'plan-trimestral',
          name: 'Trimestral',
          price: 239.90,
          duration: 90,
          description: 'Plano trimestral com 10% de desconto',
        },
      }),
      prisma.plan.create({
        data: {
          id: 'plan-semestral',
          name: 'Semestral',
          price: 449.90,
          duration: 180,
          description: 'Plano semestral com 15% de desconto',
        },
      }),
      prisma.plan.create({
        data: {
          id: 'plan-anual',
          name: 'Anual',
          price: 799.90,
          duration: 365,
          description: 'Plano anual com 25% de desconto',
        },
      }),
    ])

    // Criar funcionários
    const employees = await Promise.all([
      prisma.employee.create({
        data: {
          name: 'Carlos Silva',
          email: 'carlos.silva@gym.com',
          cpf: '12345678901',
          phone: '(11) 98765-4321',
          birthDate: new Date('1985-03-15'),
          role: 'admin',
          salary: 5000.00,
          hireDate: new Date('2020-01-10'),
          accessPin: '1234',
          permissions: ['all'],
        },
      }),
      prisma.employee.create({
        data: {
          name: 'Ana Costa',
          email: 'ana.costa@gym.com',
          cpf: '98765432109',
          phone: '(11) 91234-5678',
          birthDate: new Date('1990-07-22'),
          role: 'instructor',
          salary: 3500.00,
          hireDate: new Date('2021-06-15'),
          accessPin: '5678',
          permissions: ['schedules', 'members_view'],
        },
      }),
    ])

    // Criar membros de exemplo
    const memberNames = [
      'João Pedro Santos',
      'Maria Oliveira',
      'Lucas Ferreira',
      'Ana Paula Lima',
      'Pedro Henrique',
      'Juliana Souza',
      'Rafael Alves',
      'Beatriz Costa',
      'Thiago Martins',
      'Camila Rodrigues',
    ]

    const members = []
    for (let i = 0; i < memberNames.length; i++) {
      const cpf = String(i + 1).padStart(11, '0')
      const email = memberNames[i].toLowerCase().replace(/ /g, '.') + '@email.com'
      const planId = plans[i % plans.length].id

      const member = await prisma.member.create({
        data: {
          name: memberNames[i],
          email,
          cpf,
          phone: `(11) 9${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
          birthDate: new Date(1980 + Math.floor(Math.random() * 30), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
          gender: i % 2 === 0 ? 'M' : 'F',
          planId,
          paymentDay: 5,
          nextPayment: new Date(2026, 2, 5),
          enrollmentDate: new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        },
      })

      members.push(member)
    }

    // Criar alguns pagamentos
    const payments = []
    for (const member of members.slice(0, 5)) {
      const memberPlan = plans.find(p => p.id === member.planId)
      if (memberPlan) {
        const payment = await prisma.payment.create({
          data: {
            memberId: member.id,
            amount: memberPlan.price,
            dueDate: new Date(2026, 1, 5),
            paidAt: new Date(2026, 1, 3),
            status: 'paid',
            method: 'pix',
          },
        })
        payments.push(payment)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully!',
      data: {
        plans: plans.length,
        employees: employees.length,
        members: members.length,
        payments: payments.length,
      },
    })

  } catch (error: any) {
    console.error('Error seeding database:', error)
    return NextResponse.json(
      { 
        error: 'Failed to seed database',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

// GET para verificar status
export async function GET() {
  try {
    console.log('📥 GET /api/seed - Verificando status')
    console.log('🔍 DATABASE_URL:', {
      exists: !!process.env.DATABASE_URL,
      length: process.env.DATABASE_URL?.length || 0
    })
    
    console.log('🔍 Contando registros...')
    const plans = await prisma.plan.count()
    const members = await prisma.member.count()
    const employees = await prisma.employee.count()
    
    console.log(`📊 Contagem: ${plans} planos, ${members} membros, ${employees} funcionários`)
    
    return NextResponse.json({
      status: 'Database connection OK',
      data: {
        plans,
        members,
        employees,
        seeded: plans > 0,
      },
    })
  } catch (error: any) {
    console.error('❌ Erro no GET /api/seed:', error)
    return NextResponse.json(
      { 
        error: 'Database connection failed',
        details: error.message,
        env: {
          hasDatabaseUrl: !!process.env.DATABASE_URL,
          nodeEnv: process.env.NODE_ENV
        }
      },
      { status: 500 }
    )
  }
}
