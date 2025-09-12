console.log('Starting debug server...');

const express = require('express');
const app = express();

console.log('Express imported successfully');

app.get('/test', (req, res) => {
  res.json({ message: 'Debug server is working!' });
});

const PORT = 3002;

app.listen(PORT, (error) => {
  if (error) {
    console.error('Server failed to start:', error);
    process.exit(1);
  }
  console.log(`Debug server running on port ${PORT}`);
  console.log(`Test at: http://localhost:${PORT}/test`);
});

// Add error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
