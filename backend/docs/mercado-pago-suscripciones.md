# Suscripciones de Mercado Pago

## Arquitectura actual

AgendaYa usa suscripciones sin `preapproval_plan` de Mercado Pago. Los planes,
precios y descuentos viven en la base de datos de AgendaYa; Mercado Pago se
encarga de la autorización, los cobros recurrentes y sus reintentos.

El backend separa cuatro conceptos:

- `Plan`: catálogo y precio administrado por AgendaYa.
- `Subscription`: contrato vigente de un negocio y su estado interno.
- `SubscriptionPayment`: resultado de cada cobro recurrente.
- `WebhookEvent`: bandeja idempotente y recuperable de notificaciones.

Los strings de estado de Mercado Pago se conservan sólo como datos de soporte.
El resto de la aplicación utiliza `SubscriptionStatus` y
`SubscriptionPaymentStatus`.

## Flujo de webhooks

El endpoint público es:

```text
POST {PUBLIC_API_URL}/webhooks/mercadopago
```

Debe recibir estos tópicos:

- `subscription_preapproval`: autorización, pausa, cancelación o reactivación.
- `subscription_authorized_payment`: creación o cambio de una factura recurrente.
- `payment`: cambio de estado del pago asociado a una factura recurrente.

La respuesta HTTP no espera consultas remotas. Primero valida la firma, guarda
un `WebhookEvent` y responde `200`. Un procesador en segundo plano reclama el
evento de forma atómica, consulta la API de Mercado Pago y recién entonces
sincroniza la base de datos. Los eventos fallidos se reintentan con espera
exponencial; un evento atascado puede ser retomado por otra instancia.

La idempotencia se garantiza con claves únicas para evento, pago, factura y
suscripción. Para eventos fuera de orden también se compara la fecha de última
actualización informada por el proveedor.

El payload nunca es fuente de verdad. Antes de actualizar se comprueban:

- `external_reference` contra el UUID local de la suscripción;
- `preapproval_id` de la factura;
- monto y moneda;
- aplicación y cuenta recaudadora cuando Mercado Pago los informa;
- ambiente de prueba/producción del pago.

No se guardan payloads completos, tokens ni datos sensibles de tarjeta. Sólo se
conservan el método y los últimos cuatro dígitos cuando están disponibles.

## Estados sincronizados

- Suscripción autorizada y pago aprobado: `ACTIVE`; activa un negocio pendiente.
- Pago rechazado o revertido: `PAST_DUE`; inicia el período de gracia sin
  suspender inmediatamente el negocio.
- Reintento aprobado: vuelve de `PAST_DUE` a `ACTIVE` y limpia la mora.
- Suscripción pausada: `SUSPENDED`.
- Suscripción cancelada: `CANCELED`; no elimina el negocio ni sus datos.

Un procesador local revisa una vez por minuto únicamente vencimientos internos:

- convierte `PAST_DUE` en `SUSPENDED` cuando vence `graceEndsAt`;
- finaliza cancelaciones programadas cuando termina `currentPeriodEnd`.

Este proceso nunca intenta cobrar tarjetas. Mercado Pago realiza los cobros y
sus reintentos; AgendaYa sólo sincroniza resultados y controla el acceso.

## Cancelación y reactivación

El administrador solicita la cancelación mediante:

```text
POST /subscriptions/me/cancel
```

AgendaYa cancela inmediatamente la renovación en Mercado Pago para evitar un
nuevo cobro. Si existe un período pagado vigente, conserva localmente el estado
de acceso hasta `currentPeriodEnd` mediante `cancelAtPeriodEnd`. Después, el
procesador marca la suscripción `CANCELED` y suspende el negocio sin eliminar
reservas, usuarios ni configuración.

Una suscripción cancelada no se reactiva en Mercado Pago. Para recuperar el
servicio se utiliza:

```text
POST /subscriptions/me/reactivate
```

El backend conserva el negocio, cierra la suscripción anterior y crea una nueva
autorización para el mismo plan. El negocio sólo vuelve a `ACTIVE` después de un
pago aprobado confirmado mediante Webhook.

Cuando la suspensión fue causada por facturación, el ADMIN puede iniciar sesión
en modo restringido. El backend permite solamente `/auth/me` y
`/subscriptions/*`; agenda, personal, servicios y demás operaciones permanecen
bloqueadas hasta regularizar el pago. Las suspensiones manuales del Super Admin
no obtienen esta excepción.

## Flujo del frontend

- La portada consulta `GET /plans`; no contiene precios duplicados en el código.
- Un prospecto sin negocio envía primero su solicitud. El flujo existente de
  Super Admin crea el negocio y envía una invitación segura a su administrador.
- Un administrador autenticado inicia la autorización mediante
  `POST /subscriptions`. El backend obtiene el precio, valida el descuento y
  devuelve la URL hospedada por Mercado Pago.
- El retorno se recibe en `/suscripcion/resultado`. Esa pantalla sólo consulta
  `GET /subscriptions/me` y espera la confirmación del webhook; nunca interpreta
  los parámetros de la URL como comprobante de pago.
- La sección `/{businessSlug}/subscription` muestra el estado interno, el plan,
  la próxima fecha disponible, un medio de pago enmascarado y hasta 20 cobros.
- Esa sección permite cancelar al final del período y reactivar o regularizar
  mediante una nueva autorización alojada por Mercado Pago.

Los formularios de tarjeta permanecen en Mercado Pago. El frontend no recibe el
Access Token, el secreto de Webhooks, el número de tarjeta ni el CVV.

## Variables de entorno

```dotenv
MERCADO_PAGO_ENABLED=true
MERCADO_PAGO_USE_SANDBOX=true
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_WEBHOOK_SECRET=
MERCADO_PAGO_WEBHOOK_TOLERANCE_SECONDS=300
MERCADO_PAGO_ALLOW_UNSIGNED_SUBSCRIPTION_WEBHOOKS=false
SUBSCRIPTION_GRACE_PERIOD_DAYS=5
PUBLIC_API_URL=https://api.example.com
PUBLIC_APP_URL=https://example.com
```

Con Docker, `FRONTEND_URL` y `NEXT_PUBLIC_API_URL` también pueden definirse en
`.env.docker`. Para una prueba mediante túneles HTTPS, la primera debe admitir el
origen público del frontend y la segunda debe apuntar a la URL pública del
backend. `NEXT_PUBLIC_API_URL` se incorpora durante el build, por lo que el
contenedor del frontend debe reconstruirse después de cambiarla.

`MERCADO_PAGO_ALLOW_UNSIGNED_SUBSCRIPTION_WEBHOOKS` debe quedar en `false`. La
documentación de Mercado Pago advierte particularidades de firma en algunas
notificaciones de Suscripciones. Si en una prueba real del sandbox esos dos
tópicos llegan legítimamente sin firma, se puede habilitar temporalmente la
opción: seguirán tratándose como avisos no confiables y se verificará cada
recurso mediante la API oficial. Los eventos `payment` nunca se aceptan sin
firma.

## Prueba en sandbox

1. Ejecutar las migraciones y levantar una versión accesible por HTTPS.
2. Usar credenciales de prueba de la misma aplicación de Mercado Pago.
3. Configurar la URL pública anterior y activar los tres tópicos indicados.
4. Crear la suscripción desde AgendaYa y autorizarla con un usuario comprador
   de prueba distinto del vendedor.
5. Verificar en base de datos que `WebhookEvent` termina en `PROCESSED`, que el
   pago se registra una sola vez y que el negocio se activa sólo después de la
   confirmación del backend.
6. Reenviar el mismo evento y confirmar que no aparece un segundo pago.

Antes de producción se deben reemplazar las credenciales, usar URLs HTTPS
definitivas, ejecutar nuevamente el flujo completo y mantener separados los
eventos y credenciales de prueba y producción.
