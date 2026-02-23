# 🤖 Guía de Integración Rápida para tu IA

Pega este archivo a Claude Sonnet 4.6 junto con tu codebase para integración automática.

---

## Prompt para integrar en tu SaaS existente:

```
Tengo un módulo de Kids Check-In para iglesia que necesito integrar en mi 
proyecto Next.js existente. Los archivos están en el ZIP adjunto.

Por favor:

1. Copia components/church-checkin/ a mi carpeta components/
2. Copia app/api/checkin/route.ts a mi app/api/checkin/route.ts
3. Copia app/api/checkout/route.ts a mi app/api/checkout/route.ts  
4. Copia lib/notifications.ts y lib/constants.ts a mi lib/
5. Crea la ruta app/admin/checkin/page.tsx con:
   - Protección de mi middleware de autenticación existente
   - El componente ChurchCheckInApp
6. Agrega las variables de .env.example a mi .env.local
7. Si tengo Prisma, agrega estos modelos al schema.prisma:

model Kid {
  id          String   @id @default(cuid())
  name        String
  age         Int
  classroom   String
  allergies   String   @default("Ninguna")
  parentName  String
  parentPhone String
  createdAt   DateTime @default(now())
  checkIns    CheckIn[]
}

model CheckIn {
  id           String    @id @default(cuid())
  kidId        String
  kid          Kid       @relation(fields: [kidId], references: [id])
  securityCode String
  checkInTime  DateTime  @default(now())
  checkOutTime DateTime?
  parentNotified Boolean @default(false)
  notifProvider  String?
  notifMessageId String?
}
```

---

## Variables de entorno mínimas para funcionar:

```env
NEXT_PUBLIC_CHURCH_NAME="Tu Iglesia"
NOTIFICATION_PROVIDER=twilio_whatsapp
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

---

## Archivos clave que tu IA debe conocer:

- `ChurchCheckInApp.tsx` — Componente React principal (UI completa, ~1000 líneas)
- `lib/notifications.ts` — Envío de WhatsApp/SMS (Twilio y Meta)  
- `app/api/checkin/route.ts` — Endpoint de check-in con notificación
- `lib/constants.ts` — Salones y configuración de iglesia (editable)
- `types/index.ts` — Tipos TypeScript de todo el sistema
