// 🎥 VÍDEOS DE EXEMPLO DE EXERCÍCIOS - Pexels (Gratuitos)
// Todos os vídeos são de alta qualidade, uso comercial permitido

export const EXAMPLE_VIDEOS = {
  squat: {
    id: 'squat-example',
    name: 'Agachamento Livre (Barbell Squat)',
    description: 'Exercício composto para pernas e glúteos',
    // Vídeo gratuito do Pexels
    url: 'https://videos.pexels.com/video-files/5319292/5319292-uhd_2560_1440_25fps.mp4',
    thumbnail: 'https://images.pexels.com/videos/5319292/free-video-5319292.jpg?auto=compress&cs=tinysrgb&dpr=1&w=500',
    duration: '15s',
    author: 'Tima Miroshnichenko',
    muscles: ['Quadríceps', 'Glúteos', 'Core'],
    difficulty: 'Intermediário'
  },
  
  benchPress: {
    id: 'bench-press-example',
    name: 'Supino Reto (Bench Press)',
    description: 'Exercício fundamental para peitorais',
    url: 'https://videos.pexels.com/video-files/5320007/5320007-hd_1920_1080_25fps.mp4',
    thumbnail: 'https://images.pexels.com/videos/5320007/pictures/preview-0.jpg',
    duration: '12s',
    author: 'Tima Miroshnichenko',
    muscles: ['Peitoral', 'Tríceps', 'Deltoides Anterior'],
    difficulty: 'Intermediário'
  },
  
  deadlift: {
    id: 'deadlift-example',
    name: 'Levantamento Terra (Deadlift)',
    description: 'Movimento fundamental para força total',
    url: 'https://videos.pexels.com/video-files/4753986/4753986-hd_1920_1080_30fps.mp4',
    thumbnail: 'https://images.pexels.com/videos/4753986/pictures/preview-0.jpg',
    duration: '18s',
    author: 'cottonbro studio',
    muscles: ['Posterior', 'Lombar', 'Trapézio'],
    difficulty: 'Avançado'
  },
  
  shoulderPress: {
    id: 'shoulder-press-example',
    name: 'Desenvolvimento de Ombros (Overhead Press)',
    description: 'Exercício primário para deltoides',
    url: 'https://videos.pexels.com/video-files/4761797/4761797-hd_1920_1080_30fps.mp4',
    thumbnail: 'https://images.pexels.com/videos/4761797/pictures/preview-0.jpg',
    duration: '14s',
    author: 'cottonbro studio',
    muscles: ['Deltoides', 'Tríceps', 'Core'],
    difficulty: 'Intermediário'
  }
}

export const getAllExampleVideos = () => Object.values(EXAMPLE_VIDEOS)

export const getVideoById = (id: string) => {
  return Object.values(EXAMPLE_VIDEOS).find(v => v.id === id)
}
