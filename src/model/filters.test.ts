import { describe, expect, it } from "vitest";
import { domainMatches, matchFilters, pathMatches } from "./filters";

describe("filters", () => {
  it("matches exact domains", () => {
    expect(domainMatches("pre.example.com", "pre.example.com")).toBe(true);
    expect(domainMatches("api.pre.example.com", "pre.example.com")).toBe(false);
  });

  it("matches wildcard subdomains but not root domain", () => {
    expect(domainMatches("api.example.com", "*.example.com")).toBe(true);
    expect(domainMatches("example.com", "*.example.com")).toBe(false);
  });

  it("matches wildcard paths", () => {
    expect(pathMatches("/commerce/order", "/commerce/*")).toBe(true);
    expect(pathMatches("/api/order", "/commerce/*")).toBe(false);
  });

  it("honors excluded domains first", () => {
    const result = matchFilters("https://sso.example.com/commerce/order", {
      domains: ["*.example.com"],
      paths: ["/commerce/*"],
      excludedDomains: ["sso.example.com"]
    });
    expect(result).toMatchObject({
      matched: false,
      matchedDomain: true,
      matchedPath: true,
      excluded: true
    });
  });

  it("treats empty domain filters as matching every domain", () => {
    const result = matchFilters("https://any.example.org/commerce/order", {
      domains: [],
      paths: ["/commerce/*"],
      excludedDomains: []
    });

    expect(result).toMatchObject({
      matched: true,
      matchedDomain: true,
      matchedPath: true,
      excluded: false
    });
  });
});
