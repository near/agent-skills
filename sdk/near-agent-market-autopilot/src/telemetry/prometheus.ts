import { createServer, type Server } from 'node:http';

import type { TelemetryBus } from './telemetry.js';

export function startPrometheusServer(params: {
  telemetry: TelemetryBus;
  host?: string;
  port?: number;
}): Server {
  const host = params.host ?? '127.0.0.1';
  const port = params.port ?? 9464;

  const server = createServer((req, res) => {
    if (!req.url || !req.url.startsWith('/metrics')) {
      res.statusCode = 404;
      res.end('not found');
      return;
    }

    res.setHeader('content-type', 'text/plain; version=0.0.4');
    res.end(params.telemetry.toPrometheus());
  });

  server.listen(port, host);
  return server;
}
