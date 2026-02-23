import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Criar planos
  console.log('Creating plans...')
  const plans = await Promise.all([
    prisma.plan.upsert({
      where: { id: 'plan-mensal' },
      update: {},
      create: {
        id: 'plan-mensal',
        name: 'Mensal',
        price: 89.90,
        duration: 30,
        description: 'Plano mensal com acesso completo à academia',
      },
    }),
    prisma.plan.upsert({
      where: { id: 'plan-trimestral' },
      update: {},
      create: {
        id: 'plan-trimestral',
        name: 'Trimestral',
        price: 239.90,
        duration: 90,
        description: 'Plano trimestral com 10% de desconto',
      },
    }),
    prisma.plan.upsert({
      where: { id: 'plan-semestral' },
      update: {},
      create: {
        id: 'plan-semestral',
        name: 'Semestral',
        price: 449.90,
        duration: 180,
        description: 'Plano semestral com 15% de desconto',
      },
    }),
    prisma.plan.upsert({
      where: { id: 'plan-anual' },
      update: {},
      create: {
        id: 'plan-anual',
        name: 'Anual',
        price: 799.90,
        duration: 365,
        description: 'Plano anual com 25% de desconto',
      },
    }),
  ])

  console.log(`✅ Created ${plans.length} plans`)

  // Criar funcionários
  console.log('Creating employees...')
  const employees = await Promise.all([
    prisma.employee.upsert({
      where: { cpf: '12345678901' },
      update: {},
      create: {
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
    prisma.employee.upsert({
      where: { cpf: '98765432109' },
      update: {},
      create: {
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

  console.log(`✅ Created ${employees.length} employees`)

  // Criar membros de exemplo
  console.log('Creating members...')
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
    const cpf = `${String(i + 1).padStart(11, '0')}`
    const email = memberNames[i].toLowerCase().replace(/ /g, '.') + '@email.com'
    const planId = plans[i % plans.length].id

    const member = await prisma.member.upsert({
      where: { cpf },
      update: {},
      create: {
        name: memberNames[i],
        email,
        cpf,
        phone: `(11) 9${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
        birthDate: new Date(1980 + Math.floor(Math.random() * 30), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        gender: i % 2 === 0 ? 'M' : 'F',
        planId,
        paymentDay: 5,
        nextPayment: new Date(2026, 2, 5), // 5 de março de 2026
        enrollmentDate: new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      },
    })

    members.push(member)
  }

  console.log(`✅ Created ${members.length} members`)

  // Criar alguns pagamentos
  console.log('Creating payments...')
  const payments = []
  for (const member of members.slice(0, 5)) {
    const payment = await prisma.payment.create({
      data: {
        memberId: member.id,
        amount: plans.find(p => p.id === member.planId)!.price,
        dueDate: new Date(2026, 1, 5),
        paidAt: new Date(2026, 1, 3),
        status: 'paid',
        method: 'pix',
      },
    })
    payments.push(payment)
  }

  console.log(`✅ Created ${payments.length} payments`)

  console.log('✨ Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
