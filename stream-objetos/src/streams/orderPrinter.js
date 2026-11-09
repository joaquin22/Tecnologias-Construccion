import { Writable } from 'node:stream';

/**
 * Stream de escritura (Writable) en objectMode.
 * Recibe objetos y los imprime por consola con formato y colores.
 */
export class OrderPrinterStream extends Writable {
  constructor(options = {}) {
    super({ objectMode: true, ...options });
    this.receivedCount = 0;
    this.totalSum = 0;
  }

  _write(order, encoding, callback) {
    this.receivedCount++;
    this.totalSum += order.totalAmount;

    // Colores ANSI para la consola
    const reset = '\x1b[0m';
    const bold = '\x1b[1m';
    const dim = '\x1b[2m';
    const cyan = '\x1b[36m';

    let statusColor = '\x1b[32m'; // verde
    if (order.status === 'REQUIERE_VERIFICACION') statusColor = '\x1b[33m'; // amarillo
    if (order.status === 'EXPRESS') statusColor = '\x1b[35m'; // magenta

    console.log(
      ` ${cyan}[#${order.index}/${order.totalOrders}]${reset} ` +
      `${bold}${order.orderId}${reset} | ` +
      `👤 ${order.customer.padEnd(14, ' ')} | ` +
      `📦 ${order.product.padEnd(26, ' ')} | ` +
      `Sub: $${String(order.amount).padStart(4, ' ')} + IVA: $${String(order.tax).padStart(6, ' ')} = ` +
      `${bold}$${String(order.totalAmount).padStart(7, ' ')}${reset} | ` +
      `${statusColor}${order.status.padEnd(21, ' ')}${reset} ${dim}(${order.priority})${reset}`
    );

    callback();
  }

  _final(callback) {
    console.log('\x1b[90m------------------------------------------------------------------------------------\x1b[0m');
    console.log(
      `📊 \x1b[1mResumen final del Stream:\x1b[0m Objetos procesados: \x1b[36m${this.receivedCount}\x1b[0m | ` +
      `Monto acumulado: \x1b[32m$${this.totalSum.toFixed(2)} USD\x1b[0m`
    );
    console.log('\x1b[90m------------------------------------------------------------------------------------\x1b[0m');
    callback();
  }
}
