// Vídeos de exemplo - usando URLs públicas com CORS
// Para produção, hospedar os vídeos no próprio servidor ou CDN

export const EXAMPLE_VIDEOS = {
  squat: {
    id: 'squat-example',
    name: 'Agachamento Livre',
    description: 'Exercício composto para pernas e glúteos',
    url: '/videos/squat-demo.mp4',
    duration: '15s',
    author: 'GYM System',
    muscles: ['Quadríceps', 'Glúteos', 'Core'],
    difficulty: 'Intermediário'
  },
  benchPress: {
    id: 'bench-press-example',
    name: 'Supino Reto',
    description: 'Exercício fundamental para peitorais',
    url: '/videos/bench-demo.mp4',
    duration: '12s',
    author: 'GYM System',
    muscles: ['Peitoral', 'Tríceps', 'Deltóides'],
    difficulty: 'Intermediário'
  },
  deadlift: {
    id: 'deadlift-example',
    name: 'Levantamento Terra',
    description: 'Movimento fundamental para força total',
    url: '/videos/deadlift-demo.mp4',
    duration: '18s',
    author: 'GYM System',
    muscles: ['Posterior', 'Lombar', 'Trapézio'],
    difficulty: 'Avançado'
  },
  shoulderPress: {
    id: 'shoulder-press-example',
    name: 'Desenvolvimento Ombros',
    description: 'Exercício primário para deltóides',
    url: '/videos/shoulder-demo.mp4',
    duration: '14s',
    author: 'GYM System',
    muscles: ['Deltóides', 'Tríceps', 'Core'],
    difficulty: 'Intermediário'
  }
}

export const getAllExampleVideos = () => Object.values(EXAMPLE_VIDEOS)

export const getVideoById = (id: string) => {
  return Object.values(EXAMPLE_VIDEOS).find(v => v.id === id)
}
