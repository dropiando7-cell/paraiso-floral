// app/(checkin)/checkin/page.tsx
// Main entry point for the Kids Check-In system UI

import { ChurchCheckInApp } from "@/components/church-checkin/ChurchCheckInApp";

export const metadata = {
  title: "Kids Check-In",
};

export default function CheckInPage() {
  return <ChurchCheckInApp />;
}
