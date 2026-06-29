import { SignUp } from "@clerk/nextjs";

// Daca elevul vine de pe pagina de preturi cu ?plan=premium, dupa inregistrare il
// trimitem direct la /upgrade (porneste Stripe Checkout). Altfel, la /dashboard.
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const redirectUrl = plan === "premium" ? "/upgrade" : "/dashboard";

  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp forceRedirectUrl={redirectUrl} />
    </div>
  );
}
