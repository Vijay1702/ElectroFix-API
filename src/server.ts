import app from './app';
import { env } from './config/env.config';
import { logger } from './config/logger.config';

const port = env.PORT || 5000;

app.listen(port, () => {
  logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${port}`);
  console.log(`🚀 Server running in ${env.NODE_ENV} mode on port ${port}`);
  console.log(`🔗 API Base URL: http://localhost:${port}${env.API_PREFIX}`);
});

// Heartbeat to keep process alive in background
setInterval(() => {
  // Keeping the event loop busy
}, 60000);
