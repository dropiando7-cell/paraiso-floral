// ─────────────────────────────────────────────────────────────────────────────
//  types/index.ts — Tipos compartidos del sistema Kids Check-In
// ─────────────────────────────────────────────────────────────────────────────

export interface Classroom {
  id: string;
  name: string;
  ageRange: string;
  teacher: string;
  capacity: number;
  color: string;
}

export interface Kid {
  id: string;
  name: string;
  age: number;
  classroom: string; // Classroom.id
  allergies: string; // "Ninguna" o descripción
  parentName: string;
  parentPhone: string; // E.164: +50499991111
  photo?: string; // emoji
  createdAt?: string;
}

export interface CheckInTicket extends Kid {
  code: string;          // 6-char security code e.g. "X7KM3P"
  checkInTime: string;   // "08:30 AM"
  checkInDate: string;   // "domingo, 22 de febrero de 2026"
  qrValue: string;       // encoded string for QR
  checkedOut?: boolean;
  checkOutTime?: string;
}

export interface NotificationResult {
  sent: boolean;
  provider: "twilio_sms" | "twilio_whatsapp" | "meta_whatsapp";
  messageId?: string;
  error?: string;
}

// API Request/Response types
export interface CheckInRequest {
  kidId: string;
  kidName: string;
  kidAge: number;
  classroomId: string;
  classroomName: string;
  teacherName: string;
  parentName: string;
  parentPhone: string;
  allergies?: string;
  churchName?: string;
  notificationProvider?: "twilio_sms" | "twilio_whatsapp" | "meta_whatsapp";
}

export interface CheckInResponse {
  success: boolean;
  data?: {
    kidId: string;
    securityCode: string;
    checkInTime: string;
    checkInDate: string;
    qrValue: string;
    notification: NotificationResult;
  };
  error?: string;
}

export interface CheckOutRequest {
  kidId: string;
  kidName: string;
  securityCode: string;
  parentName: string;
  parentPhone: string;
  classroomName: string;
  churchName?: string;
}

export interface CheckOutResponse {
  success: boolean;
  data?: {
    kidId: string;
    checkOutTime: string;
    notificationSent: boolean;
  };
  error?: string;
}
