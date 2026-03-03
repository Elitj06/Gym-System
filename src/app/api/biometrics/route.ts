import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET  /api/biometrics?type=employee|member&id=xxx  → buscar cadastro
 * POST /api/biometrics                               → salvar/atualizar cadastro
 * DELETE /api/biometrics?type=...&id=...             → desativar
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const id   = searchParams.get('id')

    if (!type || !id) {
      return NextResponse.json({ error: 'type e id obrigatórios' }, { status: 400 })
    }

    if (type === 'employee') {
      const face = await prisma.faceRecognition.findUnique({
        where: { employeeId: id },
        include: { employee: { select: { id: true, name: true, photoUrl: true } } }
      })
      return NextResponse.json({ enrolled: !!(face?.isActive), face: face || null })
    }

    if (type === 'member') {
      const face = await (prisma as any).memberFace?.findUnique?.({
        where: { memberId: id },
        include: { member: { select: { id: true, name: true, photoUrl: true } } }
      }).catch(() => null)
      return NextResponse.json({ enrolled: !!(face?.isActive), face: face || null })
    }

    return NextResponse.json({ error: 'type inválido' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, id, faceEmbedding, trainingImages, enrolledAngles, quality } = body

    if (!type || !id || !faceEmbedding) {
      return NextResponse.json({ error: 'type, id e faceEmbedding são obrigatórios' }, { status: 400 })
    }

    if (type === 'employee') {
      const employee = await prisma.employee.findUnique({ where: { id } })
      if (!employee) return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })

      const existing = await prisma.faceRecognition.findUnique({ where: { employeeId: id } })
      const face = existing
        ? await prisma.faceRecognition.update({
            where: { employeeId: id },
            data: {
              faceEmbedding,
              trainingImages: trainingImages || [],
              lastTrainedAt: new Date(),
              isActive: true,
            },
            include: { employee: { select: { name: true } } }
          })
        : await prisma.faceRecognition.create({
            data: { employeeId: id, faceEmbedding, trainingImages: trainingImages || [] },
            include: { employee: { select: { name: true } } }
          })

      return NextResponse.json({ success: true, message: 'Biometria do funcionário cadastrada', face })
    }

    if (type === 'member') {
      const member = await prisma.member.findUnique({ where: { id } })
      if (!member) return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 })

      const db = prisma as any
      const existing = await db.memberFace?.findUnique?.({ where: { memberId: id } }).catch(() => null)

      let face
      if (existing) {
        face = await db.memberFace.update({
          where: { memberId: id },
          data: {
            faceEmbedding,
            trainingImages: trainingImages || [],
            enrolledAngles: enrolledAngles || [],
            quality: quality || 0,
            lastTrainedAt: new Date(),
            isActive: true,
          },
          include: { member: { select: { name: true } } }
        })
      } else {
        face = await db.memberFace.create({
          data: {
            memberId: id,
            faceEmbedding,
            trainingImages: trainingImages || [],
            enrolledAngles: enrolledAngles || [],
            quality: quality || 0,
          },
          include: { member: { select: { name: true } } }
        })
      }

      return NextResponse.json({ success: true, message: 'Biometria do aluno cadastrada', face })
    }

    return NextResponse.json({ error: 'type inválido' }, { status: 400 })
  } catch (err: any) {
    console.error('Biometrics POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const id   = searchParams.get('id')

    if (!type || !id) {
      return NextResponse.json({ error: 'type e id obrigatórios' }, { status: 400 })
    }

    if (type === 'employee') {
      await prisma.faceRecognition.update({ where: { employeeId: id }, data: { isActive: false } })
    } else if (type === 'member') {
      await (prisma as any).memberFace?.update?.({ where: { memberId: id }, data: { isActive: false } })
    }

    return NextResponse.json({ success: true, message: 'Biometria desativada' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
