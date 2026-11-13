#!/usr/bin/env python
"""Producer (P) — envía un único mensaje a la cola 'hello'.

Tutorial 1 oficial: https://www.rabbitmq.com/tutorials/tutorial-one-python
"""
import pika

connection = pika.BlockingConnection(
    pika.ConnectionParameters(host='localhost'))
channel = connection.channel()

channel.queue_declare(queue='hello', durable=True, arguments={'x-queue-type': 'quorum'})

channel.basic_publish(exchange='', routing_key='hello', body='Hola Mundo!')
print(" [x] Sent 'Hola Mundo!'")
connection.close()
