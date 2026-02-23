// Script para popular o banco de dados diretamente
// Execute com: node populate-database.js

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:*Glockblss213@db.uefeequpwjpkeorkmwbe.supabase.co:5432/postgres'
    }
  }
})

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...\n')

  try {
    // Verificar se já foi executado
    console.log('🔍 Verificando se banco já foi populado...')
    const existingPlans = await prisma.plan.count()
    
    if (existingPlans > 0) {
      console.log('⚠️  Banco já foi populado anteriormente!')
      console.log(`   Encontrados: ${existingPlans} planos\n`)
      
      const continuar = process.argv.includes('--force')
      if (!continuar) {
        console.log('💡 Use --force para popular novamente')
        process.exit(0)
      }
      
      console.log('🗑️  Limpando dados existentes...')
      await prisma.payment.deleteMany()
      await prisma.accessLog.deleteMany()
      await prisma.member.deleteMany()
      await prisma.schedule.deleteMany()
      await prisma.employee.deleteMany()
      await prisma.plan.deleteMany()
      console.log('✅ Dados limpos!\n')
    }

    // Criar planos
    console.log('📋 Criando planos...')
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
    console.log(`✅ ${plans.length} planos criados!\n`)

    // Criar funcionários
    console.log('👥 Criando funcionários...')
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
    console.log(`✅ ${employees.length} funcionários criados!\n`)

    // Criar membros
    console.log('🏋️ Criando membros...')
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
    console.log(`✅ ${members.length} membros criados!\n`)

    // Criar pagamentos
    console.log('💰 Criando pagamentos...')
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
    console.log(`✅ ${payments.length} pagamentos criados!\n`)

    console.log('═══════════════════════════════════════')
    console.log('🎉 SEED COMPLETO COM SUCESSO!')
    console.log('═══════════════════════════════════════')
    console.log(`📊 Resumo:`)
    console.log(`   - ${plans.length} planos`)
    console.log(`   - ${employees.length} funcionários`)
    console.log(`   - ${members.length} membros`)
    console.log(`   - ${payments.length} pagamentos`)
    console.log('═══════════════════════════════════════\n')

  } catch (error) {
    console.error('❌ Erro ao popular banco:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
