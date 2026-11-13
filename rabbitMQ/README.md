# Tutorial 1 RabbitMQ — "Hello World!" (Python + Docker)

Réplica del tutorial oficial https://www.rabbitmq.com/tutorials/tutorial-one-python
usando la imagen oficial https://hub.docker.com/_/rabbitmq (`rabbitmq:4-management`).

Arquitectura:

```
P (send.py) ---> [cola 'hello' en RabbitMQ] ---> C (receive.py)
```

## 1. Requisitos

- Docker + Docker Compose
- Python 3.10+ y [uv](https://docs.astral.sh/uv/) (o `pip`)

## 2. Levantar RabbitMQ

```bash
docker compose up -d
docker compose ps
docker compose logs -f rabbitmq   # ver arranque (opcional)
```

- AMQP: `localhost:5672` (aquí se conectan `send.py` / `receive.py` con pika)
- Management UI: http://localhost:15672 (usuario/clave: `guest` / `guest`)

Bajarlo:

```bash
docker compose down        # conserva datos (volumen rabbitmq_data)
docker compose down -v     # borra también los datos
```

> Imagen usada: `rabbitmq:4-management` (broker + plugin de management).
> Alternativa liviana sin UI: `rabbitmq:4-alpine` (quitar el puerto 15672).

## 3. Instalar dependencias Python

Con `uv` (recomendado):

```bash
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
```

Con `pip` clásico:

```bash
python -m pip install pika --upgrade
```

## 4. Ejecutar el ejemplo

Terminal 1 — consumer (queda escuchando):

```bash
python receive.py
# => [*] Waiting for messages. To exit press CTRL+C
```

Terminal 2 — producer (envía y termina):

```bash
python send.py
# => [x] Sent 'Hello World!'
```

El consumer imprime:

```
# => [*] Waiting for messages. To exit press CTRL+C
# => [x] Received b'Hello World!'
```

El consumer no termina solo: se detiene con `Ctrl+C`.

## 5. Archivos

| Archivo | Descripción |
|---|---|
| `docker-compose.yml` | Broker RabbitMQ en Docker |
| `send.py` | Producer: declara cola `hello` (quorum, durable) y publica `Hello World!` vía default exchange |
| `receive.py` | Consumer: declara la misma cola, suscribe `callback` con `basic_consume(auto_ack=True)` y queda en `start_consuming()` |
| `requirements.txt` | `pika` (cliente AMQP 0-9-1 recomendado) |

## 6. Verificación útil

```bash
# Ver colas y mensajes (usuario privilegiado dentro del contenedor):
docker exec rabbitmq-hello rabbitmqctl list_queues name messages_ready messages_unacknowledged type
```
