import { Sequelize } from 'sequelize';
import { logger } from '../utils/logger';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://gym_user:gym_password@localhost:5432/gym_db';

export const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
  },
});

export const connectDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
    }
    
    logger.info('PostgreSQL database connection established successfully');
  } catch (error) {
    logger.error('Unable to connect to PostgreSQL database:', error);
    throw error;
  }
};

export default sequelize;
