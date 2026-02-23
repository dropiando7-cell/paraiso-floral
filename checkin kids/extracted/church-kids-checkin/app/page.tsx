import { redirect } from "next/navigation";

// Redirect root to the check-in app
// If embedding as a sub-route in your SaaS, adjust this path
export default function HomePage() {
  redirect("/checkin");
}
