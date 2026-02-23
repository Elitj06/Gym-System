import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/members/[id] - Obter um membro específico
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const member = await prisma.member.findUnique({
      where: { id: params.id },
      include: {
        plan: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        accessLogs: {
          orderBy: { checkIn: 'desc' },
          take: 20,
        },
      },
    })

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(member)
  } catch (error) {
    console.error('Error fetching member:', error)
    return NextResponse.json(
      { error: 'Failed to fetch member' },
      { status: 500 }
    )
  }
}

// PATCH /api/members/[id] - Atualizar um membro
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    // Remover campos que não podem ser atualizados diretamente
    const { id, createdAt, updatedAt, ...updateData } = body

    const member = await prisma.member.update({
      where: { id: params.id },
      data: updateData,
      include: {
        plan: true,
      },
    })

    return NextResponse.json(member)
  } catch (error: any) {
    console.error('Error updating member:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    )
  }
}

// DELETE /api/members/[id] - Deletar um membro
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.member.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Member deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting member:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to delete member' },
      { status: 500 }
    )
  }
}
