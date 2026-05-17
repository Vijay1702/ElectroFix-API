import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env.config';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sri Senthil Spares & Services API Documentation',
      version: '1.0.0',
      description: 'API documentation for the Sri Senthil Spares & Services Shop Management System',
      contact: {
        name: 'Sri Senthil Support',
        email: 'support@srisenthil.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT || 5000}/api/v1`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/models/*.ts'], // Path to the API docs
};

export const swaggerSpec = swaggerJsdoc(options);
