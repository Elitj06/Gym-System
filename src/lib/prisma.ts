import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

if (process.env.DATABASE_URL) {
  console.log('✅ DATABASE_URL está configurada')
} else {
  console.warn('⚠️ DATABASE_URL não está definida - APIs de banco de dados podem falhar')
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
