const { createProxyMiddleware } = require('http-proxy-middleware');

// IMPORTANT: Hard-code the correct API URL to ensure it works
const API_URL = process.env.REACT_APP_API_URL || 'https://api.daycarealert.com'
// const API_URL = 'http://localhost:8084';
console.log('setupProxy: Using optimized MySQL API URL:', API_URL);

module.exports = function(app) {
  // Configure proxy to backend API with improved options
  app.use(
    '/api',
    createProxyMiddleware({
      target: API_URL,
      changeOrigin: true,
      secure: false, // Don't validate SSL certs
      pathRewrite: { '^/api': '/api' },
      logLevel: 'debug',
      // Increase timeouts to prevent premature disconnection
      timeout: 10000, // 10 seconds
      proxyTimeout: 10000, // 10 seconds
      // Handle connection errors with detailed logging
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        console.error('Request URL:', req.url);
        console.error('Request method:', req.method);
        
        // Send helpful error to client
        res.writeHead(500, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({
          error: true,
          message: 'Backend connection error: ' + err.message,
          code: err.code || 'PROXY_ERROR',
          url: req.url
        }));
      },
      // Log proxy requests
      onProxyReq: (proxyReq, req, res) => {
        console.log(`Proxying ${req.method} ${req.url} to ${API_URL}`);
      },
      // Log proxy response errors
      onProxyRes: (proxyRes, req, res) => {
        if (proxyRes.statusCode >= 400) {
          console.error(`Proxy response error: ${proxyRes.statusCode} for ${req.url}`);
        }
      }
    })
  );
};
