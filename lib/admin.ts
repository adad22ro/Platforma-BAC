import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

// Lista de email-uri cu acces la /admin. Configurabila prin env (ADMIN_EMAILS,
// separate prin virgula). Daca env nu e setat, se foloseste valoarea default.
const DEFAULT_ADMIN_EMAILS = ["gabirusu2000@gmail.com"];

export function getAdminEmails(): string[] {
  const fromEnv = process.env.ADMIN_EMAILS;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv.split(",").map((e) => e.trim().toLowerCase());
  }
  return DEFAULT_ADMIN_EMAILS.map((e) => e.toLowerCase());
}

// Verifica daca utilizatorul curent e admin. Daca nu, redirectioneaza la "/".
// Returneaza email-ul admin-ului pentru afisare.
export async function requireAdmin(): Promise<string> {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const email = user.primaryEmailAddress?.emailAddress?.toLowerCase() ?? "";
  const admins = getAdminEmails();

  if (!email || !admins.includes(email)) {
    redirect("/");
  }
  return email;
}
