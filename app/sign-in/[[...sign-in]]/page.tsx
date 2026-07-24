import { SignIn } from "@clerk/nextjs";

// forceRedirectUrl (nu fallback): dupa autentificare mergem intotdeauna la /dashboard.
// Fara el, Clerk se intoarce la pagina de provenienta (ex. landing-ul, daca ai dat
// click pe "Autentificare" acolo), pentru ca SIGN_IN_FALLBACK_REDIRECT_URL se aplica
// doar cand nu exista alta destinatie.
export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn forceRedirectUrl="/dashboard" />
    </div>
  );
}
