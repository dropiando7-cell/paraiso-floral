// src/lib/checkin-constants.ts
// Configuración de salones para el Retiro "Unidos en Adoración 2026"
// Misión Cristiana Elim Honduras

import type { Classroom } from "@/types/checkin";

export const CHURCH_NAME =
    process.env.NEXT_PUBLIC_CHURCH_NAME || "Misión Cristiana Elim Honduras";

// Salones — edita nombres, edades, maestros y capacidades según las necesidades del retiro
export const CLASSROOMS: Classroom[] = [
    {
        id: "c1",
        name: "Semillitas",
        ageRange: "0–2 años",
        teacher: "Hermana María",
        capacity: 20,
        color: "#FF6B9D",
    },
    {
        id: "c2",
        name: "Jardín de Dios",
        ageRange: "3–5 años",
        teacher: "Hermano Pablo",
        capacity: 30,
        color: "#4ECDC4",
    },
    {
        id: "c3",
        name: "Guerreros de Fe",
        ageRange: "6–8 años",
        teacher: "Hermana Ana",
        capacity: 40,
        color: "#FFE66D",
    },
    {
        id: "c4",
        name: "Héroes Bíblicos",
        ageRange: "9–11 años",
        teacher: "Hermano Luis",
        capacity: 40,
        color: "#A8E6CF",
    },
    {
        id: "c5",
        name: "Jóvenes Creyentes",
        ageRange: "12–14 años",
        teacher: "Hermana Rosa",
        capacity: 35,
        color: "#C3A6FF",
    },
];

/** Sugiere el salón apropiado basado en la edad del niño */
export function suggestClassroom(age: number): string {
    if (age <= 2) return "c1";
    if (age <= 5) return "c2";
    if (age <= 8) return "c3";
    if (age <= 11) return "c4";
    return "c5";
}

/** Genera un código de seguridad de 6 caracteres alfanuméricos sin ambigüedad */
export function generateSecurityCode(length = 6): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from(
        { length },
        () => chars[Math.floor(Math.random() * chars.length)]
    ).join("");
}
