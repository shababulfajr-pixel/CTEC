import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Request, Response } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getRuntimeMapsApiKey(): string {
  const candidates = [
    process.env.VITE_GOOGLE_MAPS_API_KEY,
    process.env.GOOGLE_MAPS_API_KEY,
    process.env.MAPS_API_KEY,
  ];
  for (const raw of candidates) {
    const cleaned = (raw || '').trim();
    if (cleaned && cleaned !== 'MY_GOOGLE_MAPS_API_KEY') {
      return cleaned;
    }
  }
  return '';
}

function injectRuntimeConfig(html: string): string {
  const runtimeConfig = {
    googleMapsApiKey: getRuntimeMapsApiKey(),
  };
  const safeJson = JSON.stringify(runtimeConfig).replace(/</g, '\\u003c');
  const scriptTag = `<script>window.__APP_RUNTIME_CONFIG__=${safeJson};</script>`;
  if (html.includes('</head>')) {
    return html.replace('</head>', `  ${scriptTag}\n  </head>`);
  }
  return `${scriptTag}\n${html}`;
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const port = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.get('/api/runtime-config', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      googleMapsApiKey: getRuntimeMapsApiKey(),
    });
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const hmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: { server: httpServer },
        hmr: hmrDisabled ? false : { server: httpServer },
      },
      appType: 'custom',
    });

    app.use(vite.middlewares);

    app.use('*', async (req: Request, res: Response, next) => {
      try {
        const url = req.originalUrl;
        const templatePath = path.resolve(__dirname, 'index.html');
        let template = fs.readFileSync(templatePath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        template = injectRuntimeConfig(template);
        res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(template);
      } catch (err) {
        vite.ssrFixStacktrace(err as Error);
        next(err);
      }
    });
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    const indexHtmlPath = path.join(distDir, 'index.html');

    app.use(express.static(distDir, { index: false }));

    app.get('*', (_req: Request, res: Response) => {
      if (!fs.existsSync(indexHtmlPath)) {
        res.status(503).send('Application build not found.');
        return;
      }
      const html = fs.readFileSync(indexHtmlPath, 'utf-8');
      res
        .status(200)
        .set({
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
        })
        .send(injectRuntimeConfig(html));
    });
  }

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`CTEC CRM server listening on http://0.0.0.0:${port}`);
  });
}

void startServer();
