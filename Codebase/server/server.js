const app = require('./src/app');
const config = require('./src/config/config');

const PORT = config.port;

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

// Keep the process alive for debugging (remove after testing)
setInterval(() => {}, 1000);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('IUTVerse backend ready!');
  console.log(`Environment: ${config.nodeEnv}`);
});