import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream';
import { OrderGeneratorStream } from './streams/orderGenerator.js';
import { OrderProcessorStream } from './streams/orderProcessor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

/**
 * Transform Stream puente:
 * Convierte objetos JavaScript (objectMode: true) a texto con formato SSE
 * para transmitirlos a través de la conexión HTTP del navegador (byte stream).
 */
class ObjectToSSEStream extends Transform {
  constructor() {
    super({
      writableObjectMode: true, // Recibe objetos JS
      readableObjectMode: false  // Emite strings/Buffers para HTTP
    });
  }

  _transform(order, encoding, callback) {
    const sseChunk = `data: ${JSON.stringify(order)}\n\n`;
    this.push(sseChunk);
    callback();
  }

  _final(callback) {
    this.push(`event: done\ndata: {"message": "Stream completado"}\n\n`);
    callback();
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Endpoint 1: Servir la interfaz web visual
  if (url.pathname === '/' || url.pathname === '/index.html') {
    const filePath = path.join(__dirname, '../public/index.html');
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Error al cargar la interfaz web.');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    });
    return;
  }

  // Endpoint 2: Stream de objetos mediante Server-Sent Events (SSE)
  if (url.pathname === '/api/stream') {
    const total = parseInt(url.searchParams.get('total') || '15', 10);
    const intervalMs = parseInt(url.searchParams.get('interval') || '400', 10);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    console.log(`📡 [HTTP SSE] Cliente conectado. Iniciando stream de ${total} objetos cada ${intervalMs}ms...`);

    const generator = new OrderGeneratorStream({ total, intervalMs });
    const processor = new OrderProcessorStream({ taxRate: 0.16 });
    const sseBridge = new ObjectToSSEStream();

    // Conectamos: Generator (object) -> Processor (object) -> Bridge (string) -> res (HTTP)
    pipeline(generator, processor, sseBridge, res, (err) => {
      if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
        console.error('❌ Error en el pipeline de red:', err);
      } else {
        console.log('✅ [HTTP SSE] Stream completado y cerrado.');
      }
    });

    // Limpieza si el cliente cierra la pestaña o aborta la petición
    req.on('close', () => {
      generator.destroy();
      processor.destroy();
      sseBridge.destroy();
    });
    return;
  }

  // Ruta 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
});

server.listen(PORT, () => {
  console.log(`\n====================================================`);
  console.log(`🌐 Servidor de Streams iniciado en http://localhost:${PORT}`);
  console.log(`👉 Abre tu navegador en http://localhost:${PORT} para ver el stream`);
  console.log(`⌨️  O ejecuta "npm run cli" para verlo en la terminal`);
  console.log(`====================================================\n`);
});
