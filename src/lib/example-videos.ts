// 🎥 VÍDEOS DE EXEMPLO DE EXERCÍCIOS
// Usando vídeos públicos com CORS headers compatíveis

export const EXAMPLE_VIDEOS = {
  squat: {
    id: 'squat-example',
    name: 'Agachamento Livre (Barbell Squat)',
    description: 'Exercício composto para pernas e glúteos',
    url: 'https://cdn.pixabay.com/video/2020/07/30/45349-445038872_large.mp4',
    thumbnail: '',
    duration: '15s',
    author: 'Demonstração',
    muscles: ['Quadríceps', 'Glúteos', 'Core'],
    difficulty: 'Intermediário'
  },
  
  benchPress: {
    id: 'bench-press-example',
    name: 'Supino Reto (Bench Press)',
    description: 'Exercício fundamental para peitorais',
    url: 'https://cdn.pixabay.com/video/2021/01/18/62525-503070825_large.mp4',
    thumbnail: '',
    duration: '12s',
    author: 'Demonstração',
    muscles: ['Peitoral', 'Tríceps', 'Deltoides Anterior'],
    difficulty: 'Intermediário'
  },
  
  deadlift: {
    id: 'deadlift-example',
    name: 'Levantamento Terra (Deadlift)',
    description: 'Movimento fundamental para força total',
    url: 'https://cdn.pixabay.com/video/2020/07/30/45349-445038872_large.mp4',
    thumbnail: '',
    duration: '18s',
    author: 'Demonstração',
    muscles: ['Posterior', 'Lombar', 'Trapézio'],
    difficulty: 'Avançado'
  },
  
  shoulderPress: {
    id: 'shoulder-press-example',
    name: 'Desenvolvimento de Ombros',
    description: 'Exercício primário para deltoides',
    url: 'https://cdn.pixabay.com/video/2021/01/18/62525-503070825_large.mp4',
    thumbnail: '',
    duration: '14s',
    author: 'Demonstração',
    muscles: ['Deltoides', 'Tríceps', 'Core'],
    difficulty: 'Intermediário'
  }
}

export const getAllExampleVideos = () => Object.values(EXAMPLE_VIDEOS)

export const getVideoById = (id: string) => {
  return Object.values(EXAMPLE_VIDEOS).find(v => v.id === id)
}
