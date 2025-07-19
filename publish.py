#!/usr/bin/env python
"""
publish.py  –  Envía un mensaje de prueba a RabbitMQ
"""

import json
import pika
import sys
from datetime import datetime, timezone

# ▸ Parámetros ---------------------------------------------------------------
RABBIT_URL = "amqp://guest:guest@localhost/"        # ajusta si usas otro host/credencial
EXCHANGE    = "gymcore-exchange"
ROUTING_KEY = "membership.activated.notification"

payload = {
    "membershipId": "de98f01b-7f7a-474d-a98c-12015e35df27",
    "userId":       "df1ed9e9-1e85-4bba-a8ef-78ffe391e123",
    "activationDate": datetime.now(timezone.utc).isoformat(),
    "membershipType": "Premium"
}
# ---------------------------------------------------------------------------

connection = pika.BlockingConnection(pika.URLParameters(RABBIT_URL))
channel    = connection.channel()

# Asegurarnos de que el exchange exista (topic, durable)
channel.exchange_declare(exchange=EXCHANGE, exchange_type="topic", durable=True)

channel.basic_publish(
    exchange   = EXCHANGE,
    routing_key= ROUTING_KEY,
    body       = json.dumps(payload),
    properties = pika.BasicProperties(
        content_type="application/json",
        delivery_mode=2            # 2 = persistent
    )
)

print("✅ Mensaje publicado:", json.dumps(payload, indent=2))
connection.close()
