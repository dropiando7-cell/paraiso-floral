// src/types/checkin.ts
// Tipos compartidos del módulo Kids Check-In

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
    allergies: string;
    parentName: string;
    parentPhone: string; // E.164: +50499991111
    photo?: string; // emoji
    createdAt?: string;
}

export interface CheckInTicket extends Kid {
    code: string;          // 6-char security code e.g. "X7KM3P"
    checkInTime: string;   // "08:30 AM"
    checkInDate: string;   // "domingo, 22 de febrero de 2026"
    qrValue: string;
    checkedOut?: boolean;
    checkOutTime?: string;
}

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
}

export interface CheckInResponse {
    success: boolean;
    data?: {
        kidId: string;
        securityCode: string;
        checkInTime: string;
        checkInDate: string;
        qrValue: string;
        notification: {
            sent: boolean;
            provider: string;
            messageId?: string;
            error?: string;
        };
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
