import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Buscar dados faciais de um funcionário
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')

    if (!employeeId) {
      return NextResponse.json(
        { error: 'employeeId é obrigatório' },
        { status: 400 }
      )
    }

    const faceData = await prisma.faceRecognition.findUnique({
      where: { employeeId },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
          }
        }
      }
    })

    if (!faceData) {
      return NextResponse.json(
        { error: 'Dados faciais não encontrados' },
        { status: 404 }
      )
    }

    return NextResponse.json(faceData)

  } catch (error: any) {
    console.error('Erro ao buscar face data:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar dados faciais', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Treinar modelo facial de um funcionário
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { employeeId, faceEmbedding, trainingImages } = body

    if (!employeeId || !faceEmbedding) {
      return NextResponse.json(
        { error: 'employeeId e faceEmbedding são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se funcionário existe
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Funcionário não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se já tem dados faciais
    const existingFaceData = await prisma.faceRecognition.findUnique({
      where: { employeeId }
    })

    let faceRecognition

    if (existingFaceData) {
      // Atualizar dados existentes
      faceRecognition = await prisma.faceRecognition.update({
        where: { employeeId },
        data: {
          faceEmbedding,
          trainingImages: trainingImages || existingFaceData.trainingImages,
          lastTrainedAt: new Date(),
          isActive: true,
        },
        include: {
          employee: {
            select: {
              name: true,
              photoUrl: true,
            }
          }
        }
      })
    } else {
      // Criar novos dados
      faceRecognition = await prisma.faceRecognition.create({
        data: {
          employeeId,
          faceEmbedding,
          trainingImages: trainingImages || [],
        },
        include: {
          employee: {
            select: {
              name: true,
              photoUrl: true,
            }
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Modelo facial treinado com sucesso',
      faceRecognition,
    })

  } catch (error: any) {
    console.error('Erro ao treinar face:', error)
    return NextResponse.json(
      { error: 'Erro ao treinar modelo facial', details: error.message },
      { status: 500 }
    )
  }
}

// PUT - Verificar face capturada contra banco de dados
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { capturedEmbedding, threshold = 0.6 } = body

    if (!capturedEmbedding) {
      return NextResponse.json(
        { error: 'capturedEmbedding é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar todos os funcionários com reconhecimento facial ativo
    const allFaceData = await prisma.faceRecognition.findMany({
      where: { isActive: true },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            role: true,
          }
        }
      }
    })

    if (allFaceData.length === 0) {
      return NextResponse.json({
        match: false,
        message: 'Nenhum funcionário cadastrado com reconhecimento facial',
      })
    }

    // Simular comparação de embeddings
    // Em produção, usar biblioteca como face-api.js ou TensorFlow
    const capturedVector = JSON.parse(capturedEmbedding)
    
    let bestMatch: any = null
    let bestSimilarity = 0

    for (const faceData of allFaceData) {
      const storedVector = JSON.parse(faceData.faceEmbedding)
      
      // Calcular similaridade (cosine similarity simulado)
      // Em produção, usar algoritmo real
      const similarity = calculateCosineSimilarity(capturedVector, storedVector)
      
      if (similarity > bestSimilarity && similarity >= threshold) {
        bestSimilarity = similarity
        bestMatch = {
          employee: faceData.employee,
          confidence: Math.round(similarity * 100),
        }
      }
    }

    if (bestMatch) {
      return NextResponse.json({
        match: true,
        employee: bestMatch.employee,
        confidence: bestMatch.confidence,
        message: `Funcionário identificado: ${bestMatch.employee.name}`,
      })
    } else {
      return NextResponse.json({
        match: false,
        message: 'Nenhum funcionário reconhecido',
        threshold: Math.round(threshold * 100),
      })
    }

  } catch (error: any) {
    console.error('Erro ao verificar face:', error)
    return NextResponse.json(
      { error: 'Erro ao verificar reconhecimento facial', details: error.message },
      { status: 500 }
    )
  }
}

// Função auxiliar para calcular similaridade (simplificada)
function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  return similarity
}

// DELETE - Desativar reconhecimento facial
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')

    if (!employeeId) {
      return NextResponse.json(
        { error: 'employeeId é obrigatório' },
        { status: 400 }
      )
    }

    await prisma.faceRecognition.update({
      where: { employeeId },
      data: { isActive: false }
    })

    return NextResponse.json({
      success: true,
      message: 'Reconhecimento facial desativado',
    })

  } catch (error: any) {
    console.error('Erro ao desativar face:', error)
    return NextResponse.json(
      { error: 'Erro ao desativar reconhecimento facial', details: error.message },
      { status: 500 }
    )
  }
}
