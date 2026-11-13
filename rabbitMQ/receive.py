#!/usr/bin/env python
"""Consumer (C) — recibe mensajes de la cola 'hello' y los imprime.

Tutorial 1 oficial: https://www.rabbitmq.com/tutorials/tutorial-one-python
Uso:
    python receive.py
    # => [*] Waiting for messages. To exit press CTRL+C
"""
import pika
import sys
import os


def main():
    connection = pika.BlockingConnection(pika.ConnectionParameters(host='localhost'))
    channel = connection.channel()

    channel.queue_declare(queue='hello', durable=True, arguments={'x-queue-type': 'quorum'})

    def callback(ch, method, properties, body):
        print(f" [x] Received {body!r}")

    channel.basic_consume(queue='hello', on_message_callback=callback, auto_ack=True)

    print(' [*] Waiting for messages. To exit press CTRL+C')
    channel.start_consuming()


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('Interrupted')
        try:
            sys.exit(0)
        except SystemExit:
            os._exit(0)
