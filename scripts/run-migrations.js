const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function runMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao Neon PostgreSQL');

    // SQL para criar tabelas
    const migrations = `
-- ========================================
-- CRIAÇÃO DAS NOVAS TABELAS
-- ========================================

-- Tabela de Controle de Ponto (Reconhecimento Facial)
CREATE TABLE IF NOT EXISTS attendances (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    employee_id TEXT NOT NULL,
    check_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    check_out TIMESTAMP WITH TIME ZONE,
    
    face_confidence DOUBLE PRECISION,
    face_image_url TEXT,
    location TEXT,
    
    status TEXT NOT NULL DEFAULT 'present',
    is_late BOOLEAN NOT NULL DEFAULT FALSE,
    minutes_late INTEGER,
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_employee FOREIGN KEY (employee_id) 
        REFERENCES employees (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attendances_employee_checkin 
ON attendances (employee_id, check_in);

-- ========================================
-- Tabela de Score de Desempenho dos Funcionários
CREATE TABLE IF NOT EXISTS employee_scores (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    employee_id TEXT NOT NULL UNIQUE,
    
    punctuality_score DOUBLE PRECISION NOT NULL DEFAULT 100,
    customer_service_score DOUBLE PRECISION NOT NULL DEFAULT 100,
    hours_score DOUBLE PRECISION NOT NULL DEFAULT 100,
    overall_score DOUBLE PRECISION NOT NULL DEFAULT 100,
    
    total_days_worked INTEGER NOT NULL DEFAULT 0,
    total_late_arrivals INTEGER NOT NULL DEFAULT 0,
    total_early_leaves INTEGER NOT NULL DEFAULT 0,
    total_absences INTEGER NOT NULL DEFAULT 0,
    total_hours_worked DOUBLE PRECISION NOT NULL DEFAULT 0,
    
    evaluation_period TEXT NOT NULL DEFAULT 'monthly',
    last_evaluated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_employee_score FOREIGN KEY (employee_id) 
        REFERENCES employees (id) ON DELETE CASCADE
);

-- ========================================
-- Tabela de Dados Faciais (para reconhecimento)
CREATE TABLE IF NOT EXISTS face_recognitions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    employee_id TEXT NOT NULL UNIQUE,
    
    face_embedding TEXT NOT NULL,
    training_images TEXT[] NOT NULL DEFAULT '{}',
    
    last_trained_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_employee_face FOREIGN KEY (employee_id) 
        REFERENCES employees (id) ON DELETE CASCADE
);

-- ========================================
-- Tabela de Equipamentos
CREATE TABLE IF NOT EXISTS equipments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    area TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'operational',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ========================================
-- Tabela de Manutenções
CREATE TABLE IF NOT EXISTS maintenances (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    equipment_id TEXT NOT NULL,
    description TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    next_date TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_equipment FOREIGN KEY (equipment_id) 
        REFERENCES equipments (id) ON DELETE CASCADE
);

-- ========================================
-- Tabela de Câmeras IP/RTSP
CREATE TABLE IF NOT EXISTS cameras (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    rtsp_url TEXT NOT NULL,
    username TEXT,
    password TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    camera_type TEXT NOT NULL DEFAULT 'ip',
    resolution TEXT DEFAULT '1080p',
    fps INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ========================================
-- DADOS DE EXEMPLO
-- ========================================

-- Criar scores iniciais
INSERT INTO employee_scores (employee_id, punctuality_score, customer_service_score, hours_score, overall_score)
SELECT 
    id as employee_id,
    100 as punctuality_score,
    CASE 
        WHEN role = 'instructor' THEN 95
        WHEN role = 'receptionist' THEN 90
        ELSE 85
    END as customer_service_score,
    100 as hours_score,
    CASE 
        WHEN role = 'instructor' THEN 98.3
        WHEN role = 'receptionist' THEN 96.7
        ELSE 95.0
    END as overall_score
FROM employees
WHERE NOT EXISTS (
    SELECT 1 FROM employee_scores WHERE employee_scores.employee_id = employees.id
);

-- Criar dados faciais de exemplo para Carlos Silva
INSERT INTO face_recognitions (employee_id, face_embedding, training_images, is_active)
SELECT 
    id as employee_id,
    '{"v": [0.12, 0.34, 0.56, 0.78, 0.91, 0.23, 0.45, 0.67, 0.89, 0.10, 0.32, 0.54, 0.76, 0.98, 0.21, 0.43, 0.65, 0.87, 0.09, 0.31, 0.53, 0.75, 0.97, 0.20, 0.42, 0.64, 0.86, 0.08, 0.30, 0.52, 0.74, 0.96]}' as face_embedding,
    ARRAY['https://via.placeholder.com/300', 'https://via.placeholder.com/300'] as training_images,
    true as is_active
FROM employees
WHERE email = 'carlos.silva@gym.com'
AND NOT EXISTS (
    SELECT 1 FROM face_recognitions WHERE face_recognitions.employee_id = employees.id
);

-- Criar equipamentos de exemplo
INSERT INTO equipments (name, area, status)
VALUES 
    ('Esteira 1', 'Cardio', 'operational'),
    ('Esteira 2', 'Cardio', 'maintenance'),
    ('Supino Reto', 'Musculação', 'operational'),
    ('Leg Press', 'Musculação', 'operational'),
    ('Cross Over', 'Musculação', 'operational')
ON CONFLICT DO NOTHING;

-- Criar câmeras de exemplo
INSERT INTO cameras (name, location, rtsp_url, is_active, resolution, fps)
VALUES 
    ('Câmera Recepção', 'Recepção', 'rtsp://admin:admin@192.168.1.100:554/stream1', true, '1080p', 30),
    ('Câmera Musculação', 'Área de Musculação', 'rtsp://admin:admin@192.168.1.101:554/stream1', true, '1080p', 30),
    ('Câmera Cardio', 'Área de Cardio', 'rtsp://admin:admin@192.168.1.102:554/stream1', true, '720p', 25)
ON CONFLICT DO NOTHING;
`;

    await client.query(migrations);
    console.log('✅ Tabelas criadas com sucesso!');

    // Verificar tabelas
    const result = await client.query(`
      SELECT 
        'attendances' as table_name, 
        COUNT(*) as records 
      FROM attendances
      UNION ALL
      SELECT 
        'employee_scores' as table_name, 
        COUNT(*) as records 
      FROM employee_scores
      UNION ALL
      SELECT 
        'face_recognitions' as table_name, 
        COUNT(*) as records 
      FROM face_recognitions
      UNION ALL
      SELECT 
        'equipments' as table_name, 
        COUNT(*) as records 
      FROM equipments
      UNION ALL
      SELECT 
        'cameras' as table_name, 
        COUNT(*) as records 
      FROM cameras
    `);

    console.log('\n📊 Verificação das tabelas:');
    console.table(result.rows);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    await client.end();
    console.log('\n✅ Conexão fechada');
  }
}

runMigrations();
