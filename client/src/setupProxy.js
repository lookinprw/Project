const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target: "http://localhost:5000",
      changeOrigin: true,
      pathRewrite: {
        "^/api": "/api", // rewrite path
      },
      onProxyReq: (proxyReq, req, res) => {
        // Log proxy requests
        console.log("Proxying:", req.method, req.path, "→", proxyReq.path);
      },
      onError: (err, req, res) => {
        console.error("Proxy Error:", err);
        res.status(500).json({
          error: "Proxy Error",
          message: err.message,
        });
      },
    })
  );
};
