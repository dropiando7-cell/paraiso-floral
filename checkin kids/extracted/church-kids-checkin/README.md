# ✝️ Church Kids Check-In System

Sistema de control y seguridad de niños para servicios de iglesia.  
Diseñado para integrarse con tu SaaS/backend en **Next.js 14 + TypeScript + Vercel**.

---

## 🗂 Estructura del proyecto

```
church-kids-checkin/
├── app/
│   ├── layout.tsx                  # Root layout (fuentes, metadata)
│   ├── page.tsx                    # Redirige a /checkin
│   ├── checkin/
│   │   └── page.tsx                # Pantalla principal del sistema
│   └── api/
│       ├── checkin/
│       │   └── route.ts            # POST /api/checkin — registra + notifica
│       └── checkout/
│           └── route.ts            # POST /api/checkout — entrega + notifica
│
├── components/
│   └── church-checkin/
│       ├── ChurchCheckInApp.tsx    # ★ Componente principal (UI completa)
│       └── index.ts                # Barrel export
│
├── lib/
│   ├── notifications.ts            # Twilio SMS/WhatsApp + Meta WhatsApp
│   └── constants.ts                # Salones, config de iglesia
│
├── types/
│   └── index.ts                    # Tipos TypeScript compartidos
│
├── .env.example                    # Variables de entorno (copia a .env.local)
├── vercel.json                     # Config de despliegue Vercel
├── next.config.js
├── package.json
└── tsconfig.json
```

---

## 🚀 Integración en tu SaaS existente (3 pasos)

### Opción A — Copiar como módulo dentro de tu proyecto

```bash
# 1. Copia las carpetas al raíz de tu Next.js project
cp -r components/church-checkin  tu-proyecto/components/
cp -r app/api/checkin            tu-proyecto/app/api/
cp -r app/api/checkout           tu-proyecto/app/api/
cp -r lib/notifications.ts       tu-proyecto/lib/
cp -r lib/constants.ts           tu-proyecto/lib/
cp -r types/index.ts             tu-proyecto/types/church-checkin.ts

# 2. Agrega la ruta en tu app
# tu-proyecto/app/checkin/page.tsx:
# import { ChurchCheckInApp } from "@/components/church-checkin"
# export default function Page() { return <ChurchCheckInApp /> }

# 3. Agrega las variables de entorno a tu .env.local
```

### Opción B — Deploy independiente en Vercel

```bash
# 1. Instala dependencias
npm install

# 2. Copia y rellena variables
cp .env.example .env.local
# Edita .env.local con tus keys de Twilio o Meta

# 3. Deploy
vercel --prod
```

---

## ⚙️ Variables de entorno requeridas

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `NEXT_PUBLIC_CHURCH_NAME` | Nombre de tu iglesia | ✅ |
| `NOTIFICATION_PROVIDER` | `twilio_whatsapp` \| `twilio_sms` \| `meta_whatsapp` | ✅ |
| `TWILIO_ACCOUNT_SID` | Cuenta Twilio | Si usas Twilio |
| `TWILIO_AUTH_TOKEN` | Token Twilio | Si usas Twilio |
| `TWILIO_WHATSAPP_FROM` | Número WhatsApp Twilio | Si usas WhatsApp Twilio |
| `TWILIO_FROM_NUMBER` | Número SMS Twilio | Si usas SMS |
| `META_WA_TOKEN` | Token Meta Business | Si usas Meta API |
| `META_WA_PHONE_NUMBER_ID` | ID de número Meta | Si usas Meta API |
| `META_WA_TEMPLATE_NAME` | Nombre del template aprobado | Si usas Meta API |

---

## 📱 Flujo del sistema

```
Padre llega con niño
       ↓
Voluntario abre /checkin
       ↓
Busca el niño por nombre ──→ [Encontrado] → Check-In → Ticket + QR
       ↓                                         ↓
  [No encontrado]                    WhatsApp/SMS al padre
       ↓                             con código de seguridad
  Registra nuevo niño
  (2 pasos: niño + padre)
       ↓
  Check-In inmediato
       ↓
  Ticket + QR generado
       ↓
WhatsApp al padre con código
```

---

## 🔌 API Endpoints

### `POST /api/checkin`

```typescript
// Request
{
  kidId: string;
  kidName: string;
  kidAge: number;
  classroomId: string;
  classroomName: string;
  teacherName: string;
  parentName: string;
  parentPhone: string;        // E.164: +50499991111
  allergies?: string;
  churchName?: string;
}

// Response
{
  success: true,
  data: {
    kidId: string;
    securityCode: string;     // "X7KM3P"
    checkInTime: string;      // "08:30 AM"
    checkInDate: string;
    qrValue: string;          // "IGLESIA:k1:X7KM3P:1234567890"
    notification: {
      sent: boolean;
      provider: string;
      messageId?: string;
    }
  }
}
```

### `POST /api/checkout`

```typescript
// Request
{
  kidId: string;
  kidName: string;
  securityCode: string;       // Código del talón del padre
  parentName: string;
  parentPhone: string;
  classroomName: string;
}

// Response
{ success: true, data: { kidId, checkOutTime, notificationSent } }
```

---

## 🤖 Instrucciones para tu IA (Claude Sonnet 4.6)

Si le pides a tu IA que integre o modifique este módulo:

```
"Integra el componente ChurchCheckInApp en la ruta /admin/checkin de mi SaaS.
 El componente está en components/church-checkin/ChurchCheckInApp.tsx.
 Necesito que las llamadas a /api/checkin pasen por mi middleware de autenticación
 existente en middleware.ts."
```

```
"Modifica lib/constants.ts para cambiar los salones de clase con estos nuevos
 nombres y edades: [lista tus salones]"
```

```
"Agrega una base de datos Prisma para persistir los check-ins.
 El modelo debe llamarse CheckIn con campos: id, kidId, securityCode,
 checkInTime, checkOutTime, parentNotified."
```

---

## 🔗 Integraciones compatibles

| Servicio | Uso | Cómo |
|----------|-----|------|
| **Twilio** | SMS + WhatsApp | `lib/notifications.ts` → `sendTwilioWhatsApp()` |
| **Meta WhatsApp** | WhatsApp oficial | `lib/notifications.ts` → `sendMetaWhatsApp()` |
| **n8n** | Automatizaciones | Descomenta `N8N_CHECKIN_WEBHOOK` en `.env` |
| **Google Sheets** | Reportes | Conecta desde n8n con el webhook del check-in |
| **Vercel** | Deploy | `vercel.json` ya configurado |

---

## 📞 Soporte

Generado con Claude Sonnet 4.6 · Compatible con Next.js 14 App Router · Vercel Ready
