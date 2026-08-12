import { describe, it, expect } from "vitest";
import { isAllowedCheckoutUrl } from "@/lib/safe-redirect";

describe("isAllowedCheckoutUrl", () => {
  it("accepta adresele Stripe", () => {
    expect(isAllowedCheckoutUrl("https://checkout.stripe.com/c/pay/cs_test_123")).toBe(true);
    expect(isAllowedCheckoutUrl("https://billing.stripe.com/p/session/abc")).toBe(true);
    expect(isAllowedCheckoutUrl("https://stripe.com/x")).toBe(true);
  });

  it("respinge un domeniu care doar se termina in stripe.com", () => {
    // Capcana clasica de open redirect: `endsWith('stripe.com')` fara punct in
    // fata ar lasa asta sa treaca.
    expect(isAllowedCheckoutUrl("https://notstripe.com/pay")).toBe(false);
    expect(isAllowedCheckoutUrl("https://evilstripe.com")).toBe(false);
  });

  it("respinge un domeniu care are stripe.com doar in mijloc", () => {
    expect(isAllowedCheckoutUrl("https://stripe.com.atacator.ro/pay")).toBe(false);
  });

  it("cere https", () => {
    expect(isAllowedCheckoutUrl("http://checkout.stripe.com/pay")).toBe(false);
    expect(isAllowedCheckoutUrl("javascript:alert(1)")).toBe(false);
  });

  it("respinge ce nu e URL absolut sau nu e text", () => {
    expect(isAllowedCheckoutUrl("/dashboard")).toBe(false);
    expect(isAllowedCheckoutUrl("")).toBe(false);
    expect(isAllowedCheckoutUrl(null)).toBe(false);
    expect(isAllowedCheckoutUrl(undefined)).toBe(false);
    expect(isAllowedCheckoutUrl({ url: "https://checkout.stripe.com" })).toBe(false);
  });
});
