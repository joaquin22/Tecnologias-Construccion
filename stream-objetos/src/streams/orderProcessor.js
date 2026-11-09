import { Transform } from 'node:stream';

/**
 * Stream de transformación (Transform) en objectMode.
 * Recibe un objeto de pedido, calcula impuestos, clasifica el pedido
 * y emite un nuevo objeto enriquecido hacia el siguiente stream.
 */
export class OrderProcessorStream extends Transform {
  /**
   * @param {Object} [options]
   * @param {number} [options.taxRate=0.16] - Tasa de impuesto (ej. 16% IVA)
   */
  constructor(options = {}) {
    super({ objectMode: true, ...options });
    this.taxRate = options.taxRate ?? 0.16;
  }

  _transform(order, encoding, callback) {
    try {
      // order es un objeto puro de JavaScript
      const tax = Number((order.amount * this.taxRate).toFixed(2));
      const totalAmount = Number((order.amount + tax).toFixed(2));

      // Lógica de negocio sobre el objeto en tiempo de stream
      let status = 'APROBADO';
      let priority = 'NORMAL';

      if (totalAmount > 300) {
        status = 'REQUIERE_VERIFICACION';
        priority = 'ALTA';
      } else if (totalAmount < 50) {
        status = 'EXPRESS';
        priority = 'BAJA';
      }

      const processedOrder = {
        ...order,
        tax,
        totalAmount,
        status,
        priority,
        processedAt: new Date().toISOString()
      };

      // Emitimos el objeto transformado al siguiente destino
      this.push(processedOrder);
      callback();
    } catch (err) {
      callback(err);
    }
  }
}
