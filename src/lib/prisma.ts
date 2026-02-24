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
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
