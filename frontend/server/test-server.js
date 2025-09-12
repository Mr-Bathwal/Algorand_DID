const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Simple health check
app.get('/api/health', (req, res) => {
  console.log('Health check requested');
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'Test server is running'
  });
});

// Test endpoint
app.post('/api/test', (req, res) => {
  console.log('Test endpoint called:', req.body);
  res.json({ message: 'Test successful', data: req.body });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Test Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
});
