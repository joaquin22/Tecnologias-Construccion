import { Readable } from 'node:stream';

/**
 * Stream de lectura (Readable) en objectMode.
 * Genera objetos JavaScript simulando pedidos comerciales a intervalos regulares.
 */
export class OrderGeneratorStream extends Readable {
  /**
   * @param {Object} [options]
   * @param {number} [options.total=10] - Cantidad total de objetos a generar
   * @param {number} [options.intervalMs=400] - Intervalo en milisegundos entre cada objeto
   */
  constructor(options = {}) {
    super({ objectMode: true, ...options });
    this.total = options.total ?? 10;
    this.intervalMs = options.intervalMs ?? 400;
    this.count = 0;
    this._timer = null;

    this.customers = ['Ana Torres', 'Carlos Ruiz', 'Elena Gómez', 'David Morales', 'Beatriz Peña', 'Sofia Vega'];
    this.products = [
      { name: 'Laptop Ultrabook', basePrice: 850 },
      { name: 'Mouse Inalámbrico', basePrice: 25 },
      { name: 'Teclado Mecánico', basePrice: 75 },
      { name: 'Monitor 4K 27"', basePrice: 320 },
      { name: 'Auriculares Noise-Cancelling', basePrice: 150 },
      { name: 'Webcam 1080p', basePrice: 45 }
    ];
  }

  _read() {
    if (this._timer) return;

    if (this.count >= this.total) {
      this.push(null); // Fin del stream de objetos
      return;
    }

    this._timer = setTimeout(() => {
      this._timer = null;

      if (this.count >= this.total) {
        this.push(null);
        return;
      }

      this.count++;
      const prod = this.products[Math.floor(Math.random() * this.products.length)];
      const customer = this.customers[Math.floor(Math.random() * this.customers.length)];
      const variation = (Math.random() * 0.2 - 0.1); // +/- 10%
      const amount = Math.round(prod.basePrice * (1 + variation));

      const orderObject = {
        orderId: `ORD-${String(this.count).padStart(4, '0')}`,
        index: this.count,
        totalOrders: this.total,
        customer,
        product: prod.name,
        amount,
        currency: 'USD',
        createdAt: new Date().toISOString()
      };

      // Emitimos directamente un objeto JavaScript (gracias a objectMode: true)
      const shouldContinue = this.push(orderObject);
      if (shouldContinue && this.count < this.total) {
        this._read();
      }
    }, this.intervalMs);
  }

  _destroy(err, callback) {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    callback(err);
  }
}
