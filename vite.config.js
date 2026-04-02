import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { pathToFileURL } from 'url';

// Plugin que sirve las Netlify Functions localmente en /api/*
// Evita depender de `netlify dev` para el desarrollo.
function netlifyFunctionsPlugin() {
  return {
    name: 'netlify-functions-local',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();

        const url = new URL(req.url, 'http://localhost');
        const route = url.pathname.replace('/api/', '');

        const fnMap = {
          mundo:        path.resolve('./netlify/functions/mundo.js'),
          bcra:         path.resolve('./netlify/functions/bcra.js'),
          cotizaciones: path.resolve('./netlify/functions/cotizaciones.js'),
          indec:        path.resolve('./netlify/functions/indec.js'),
        };

        const fnPath = fnMap[route];
        if (!fnPath) return next();

        try {
          const qs = {};
          url.searchParams.forEach((v, k) => { qs[k] = v; });

          // import() dinamico con cache-bust para hot-reload
          const fileUrl = pathToFileURL(fnPath).href + '?t=' + Date.now();
          const fn = await import(fileUrl);

          const event = {
            httpMethod: req.method,
            path: url.pathname,
            queryStringParameters: qs,
            headers: req.headers,
            body: null,
          };

          const result = await fn.handler(event, {});

          res.writeHead(result.statusCode, result.headers || {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(result.body);
        } catch (err) {
          console.error('[netlify-fn] Error en /api/' + route + ':', err.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), netlifyFunctionsPlugin()],
});
