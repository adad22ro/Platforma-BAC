import { describe, it, expect } from "vitest";
import { isAllowedCheckoutUrl, urlCheckoutSigur } from "@/lib/safe-redirect";

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

describe("urlCheckoutSigur", () => {
  it("intoarce adresa cand e permisa", () => {
    expect(urlCheckoutSigur("https://checkout.stripe.com/c/pay/cs_test_123")).toBe(
      "https://checkout.stripe.com/c/pay/cs_test_123"
    );
  });

  it("intoarce null pentru orice altceva", () => {
    expect(urlCheckoutSigur("https://notstripe.com/pay")).toBeNull();
    expect(urlCheckoutSigur("javascript:alert(1)")).toBeNull();
    expect(urlCheckoutSigur("/dashboard")).toBeNull();
    expect(urlCheckoutSigur(null)).toBeNull();
  });

  it("intoarce exact aceleasi verdicte ca garda booleana", () => {
    // Cele doua nu au voie sa divergheze: daca cineva relaxeaza una fara alta,
    // apare o cale de redirectionare nevalidata.
    const cazuri = [
      "https://checkout.stripe.com/pay",
      "https://stripe.com.atacator.ro/pay",
      "http://checkout.stripe.com/pay",
      "",
      "/relativ",
    ];
    for (const c of cazuri) {
      expect(urlCheckoutSigur(c) !== null).toBe(isAllowedCheckoutUrl(c));
    }
  });
});
