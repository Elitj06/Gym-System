import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Listar todas as câmeras
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const location = searchParams.get('location')
    const isActive = searchParams.get('isActive')

    const where: any = {}
    
    if (location) {
      where.location = { contains: location, mode: 'insensitive' }
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true'
    }

    const cameras = await prisma.camera.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(cameras)
  } catch (error: any) {
    console.error('Erro ao buscar câmeras:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar câmeras', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Adicionar nova câmera
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      name,
      location,
      rtspUrl,
      username,
      password,
      cameraType = 'ip',
      resolution = '1080p',
      fps = 30,
    } = body

    if (!name || !location || !rtspUrl) {
      return NextResponse.json(
        { error: 'name, location e rtspUrl são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar formato RTSP URL
    if (!rtspUrl.startsWith('rtsp://') && !rtspUrl.startsWith('http://')) {
      return NextResponse.json(
        { error: 'URL deve começar com rtsp:// ou http://' },
        { status: 400 }
      )
    }

    const camera = await prisma.camera.create({
      data: {
        name,
        location,
        rtspUrl,
        username,
        password,
        cameraType,
        resolution,
        fps,
        isActive: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Câmera adicionada com sucesso',
      camera,
    })

  } catch (error: any) {
    console.error('Erro ao criar câmera:', error)
    return NextResponse.json(
      { error: 'Erro ao criar câmera', details: error.message },
      { status: 500 }
    )
  }
}

// PUT - Atualizar câmera
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID da câmera é obrigatório' },
        { status: 400 }
      )
    }

    const camera = await prisma.camera.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Câmera atualizada com sucesso',
      camera,
    })

  } catch (error: any) {
    console.error('Erro ao atualizar câmera:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar câmera', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Remover câmera
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID da câmera é obrigatório' },
        { status: 400 }
      )
    }

    await prisma.camera.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Câmera removida com sucesso',
    })

  } catch (error: any) {
    console.error('Erro ao remover câmera:', error)
    return NextResponse.json(
      { error: 'Erro ao remover câmera', details: error.message },
      { status: 500 }
    )
  }
}
