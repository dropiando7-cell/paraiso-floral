// lib/constants.ts
// ─── Configuración de tu iglesia ─────────────────────────────────────────────
// Edita estos valores para personalizar el sistema

import type { Classroom } from "@/types";

export const CHURCH_CONFIG = {
  name: process.env.NEXT_PUBLIC_CHURCH_NAME || "Iglesia Central",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
};

// Salones de clases — edita nombres, edades, maestros y capacidades
export const CLASSROOMS: Classroom[] = [
  {
    id: "c1",
    name: "Semillitas",
    ageRange: "0–2 años",
    teacher: "Hermana María",
    capacity: 10,
    color: "#FF6B9D",
  },
  {
    id: "c2",
    name: "Jardín de Dios",
    ageRange: "3–5 años",
    teacher: "Hermano Pablo",
    capacity: 15,
    color: "#4ECDC4",
  },
  {
    id: "c3",
    name: "Guerreros de Fe",
    ageRange: "6–8 años",
    teacher: "Hermana Ana",
    capacity: 20,
    color: "#FFE66D",
  },
  {
    id: "c4",
    name: "Héroes Bíblicos",
    ageRange: "9–11 años",
    teacher: "Hermano Luis",
    capacity: 20,
    color: "#A8E6CF",
  },
  {
    id: "c5",
    name: "Jóvenes Creyentes",
    ageRange: "12–14 años",
    teacher: "Hermana Rosa",
    capacity: 18,
    color: "#C3A6FF",
  },
];

// Sugerencia automática de salón por edad
export function suggestClassroom(age: number): string {
  if (age <= 2) return "c1";
  if (age <= 5) return "c2";
  if (age <= 8) return "c3";
  if (age <= 11) return "c4";
  return "c5";
}

// Generador de código de seguridad
export function generateSecurityCode(length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}
