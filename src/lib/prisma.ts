import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Verificar se DATABASE_URL existe
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL não está definida!')
  throw new Error('DATABASE_URL environment variable is not set')
}

console.log('✅ DATABASE_URL está configurada')

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Testar conexão
prisma.$connect()
  .then(() => console.log('✅ Prisma conectado ao banco'))
  .catch((err) => console.error('❌ Erro ao conectar Prisma:', err.message))
