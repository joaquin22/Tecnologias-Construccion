import { pipeline } from 'node:stream/promises';
import { OrderGeneratorStream } from './streams/orderGenerator.js';
import { OrderProcessorStream } from './streams/orderProcessor.js';
import { OrderPrinterStream } from './streams/orderPrinter.js';

console.clear();
console.log('\x1b[36m====================================================================================\x1b[0m');
console.log('\x1b[1m🚀 DEMOSTRACIÓN: Stream de Objetos en Node.js (objectMode: true)\x1b[0m');
console.log('\x1b[36m====================================================================================\x1b[0m');
console.log('\x1b[90mExplicación: Por defecto, los streams en Node.js transmiten Buffer o String.');
console.log('Con { objectMode: true }, el stream transporta directamente objetos en memoria\x1b[0m\n');

const generator = new OrderGeneratorStream({ total: 10, intervalMs: 350 });
const processor = new OrderProcessorStream({ taxRate: 0.16 });
const printer = new OrderPrinterStream();

console.log('⏳ Iniciando canalización (pipeline) de objetos...\n');

try {
  // pipeline se encarga de manejar el flujo, backpressure y cierre seguro de todos los streams
  await pipeline(generator, processor, printer);
  console.log('\n\x1b[32m✔ Stream completado exitosamente sin fugas de memoria.\x1b[0m\n');
} catch (error) {
  console.error('\n\x1b[31m✖ Error en el flujo de objetos:\x1b[0m', error);
  process.exit(1);
}
