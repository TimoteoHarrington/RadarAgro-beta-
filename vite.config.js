import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { pathToFileURL } from 'url';

// Plugin que sirve las Vercel Functions localmente en /api/*
// Evita depender de `vercel dev` para el desarrollo.
function vercelFunctionsPlugin() {
  return {
    name: 'vercel-functions-local',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();

        const url = new URL(req.url, 'http://localhost');
        const route = url.pathname.replace('/api/', '');

        const fnMap = {
          mundo:              path.resolve('./api/mundo.js'),
          bcra:               path.resolve('./api/bcra.js'),
          cotizaciones:       path.resolve('./api/cotizaciones.js'),
          indec:              path.resolve('./api/indec.js'),
          insumos:            path.resolve('./api/insumos.js'),
          fob:                path.resolve('./api/fob.js'),
          hacienda:           path.resolve('./api/hacienda.js'),
          'riesgo-pais-latam':path.resolve('./api/riesgo-pais-latam.js'),
        };

        const fnPath = fnMap[route];
        if (!fnPath) return next();

        try {
          const qs = {};
          url.searchParams.forEach((v, k) => { qs[k] = v; });

          // import() dinámico con cache-bust para hot-reload
          const fileUrl = pathToFileURL(fnPath).href + '?t=' + Date.now();
          const fn = await import(fileUrl);

          // Adaptador: simula req/res de Vercel sobre el req/res de Node
          const mockReq = {
            method: req.method,
            query: qs,
            headers: req.headers,
            body: null,
          };

          let statusCode = 200;
          const resHeaders = {};
          let responseBody = '';

          const mockRes = {
            setHeader: (k, v) => { resHeaders[k] = v; },
            status(code) { statusCode = code; return this; },
            json(data) {
              responseBody = JSON.stringify(data);
              resHeaders['Content-Type'] = resHeaders['Content-Type'] || 'application/json';
              res.writeHead(statusCode, resHeaders);
              res.end(responseBody);
            },
          };

          await fn.default(mockReq, mockRes);
        } catch (err) {
          console.error('[vercel-fn] Error en /api/' + route + ':', err.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), vercelFunctionsPlugin()],
});
