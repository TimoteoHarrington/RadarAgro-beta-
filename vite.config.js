import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { pathToFileURL } from 'url';

// Plugin que sirve las Vercel Functions localmente en /api/*
// Evita depender de `vercel dev` para el desarrollo.
//
// Soporta dos estilos de handler:
//   • Node-style  (req, res) — funciones serverless clásicas
//   • Edge-style  (Request) → Response — funciones con export const config = { runtime: 'edge' }
//
// La detección es automática: si el handler acepta 1 argumento y retorna
// algo con `.headers` (un Response), se usa el adaptador Edge.
function vercelFunctionsPlugin() {
  return {
    name: 'vercel-functions-local',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();

        const url = new URL(req.url, 'http://localhost');
        const route = url.pathname.replace('/api/', '');

        const fnMap = {
          mundo:               path.resolve('./api/mundo.js'),
          bcra:                path.resolve('./api/bcra.js'),
          cotizaciones:        path.resolve('./api/cotizaciones.js'),
          indec:               path.resolve('./api/indec.js'),
          insumos:             path.resolve('./api/insumos.js'),
          fob:                 path.resolve('./api/fob.js'),
          hacienda:            path.resolve('./api/hacienda.js'),
          'hacienda-faena':    path.resolve('./api/hacienda-faena.js'),
          fertilizantes:       path.resolve('./api/fertilizantes.js'),
          'riesgo-pais-latam': path.resolve('./api/riesgo-pais-latam.js'),
        };

        const fnPath = fnMap[route];
        if (!fnPath) return next();

        try {
          // import() dinámico con cache-bust para hot-reload
          const fileUrl = pathToFileURL(fnPath).href + '?t=' + Date.now();
          const fn = await import(fileUrl);

          // ── Detectar si es Edge Runtime (export const config = { runtime: 'edge' }) ──
          const isEdge = fn.config?.runtime === 'edge';

          if (isEdge) {
            // Adaptador Edge: construir un Request Web estándar y esperar un Response
            const fullUrl = `http://localhost${req.url}`;
            const edgeReq = new Request(fullUrl, {
              method:  req.method,
              headers: req.headers,
            });

            const edgeRes = await fn.default(edgeReq);

            res.writeHead(edgeRes.status, Object.fromEntries(edgeRes.headers.entries()));
            const body = await edgeRes.text();
            res.end(body);
          } else {
            // Adaptador Node: simula req/res de Vercel sobre el req/res de Node
            const qs = {};
            url.searchParams.forEach((v, k) => { qs[k] = v; });

            const mockReq = {
              method:  req.method,
              query:   qs,
              headers: req.headers,
              body:    null,
            };

            let statusCode = 200;
            const resHeaders = {};

            const mockRes = {
              setHeader: (k, v) => { resHeaders[k] = v; },
              status(code) { statusCode = code; return this; },
              json(data) {
                resHeaders['Content-Type'] = resHeaders['Content-Type'] || 'application/json';
                res.writeHead(statusCode, resHeaders);
                res.end(JSON.stringify(data));
              },
              end() {
                res.writeHead(statusCode, resHeaders);
                res.end();
              },
            };

            await fn.default(mockReq, mockRes);
          }
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
