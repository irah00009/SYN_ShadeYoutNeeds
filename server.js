const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the root directory (for assets, CSS, JS, etc.)
app.use(express.static(path.join(__dirname), {
  maxAge: '1d', // Cache static assets for 1 day
  etag: true
}));

// Explicitly serve assets folder
app.use('/assets', express.static(path.join(__dirname, 'assets'), {
  maxAge: '1d',
  etag: true
}));

// Serve index.html for all routes (SPA routing) - this should be last
app.get('*', (req, res) => {
  // Don't serve index.html for asset requests
  if (req.path.startsWith('/assets/') || 
      req.path.endsWith('.png') || 
      req.path.endsWith('.jpg') || 
      req.path.endsWith('.svg') ||
      req.path.endsWith('.css') ||
      req.path.endsWith('.js')) {
    return res.status(404).send('Not found');
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
  console.log(`Static files being served from: ${__dirname}`);
});

