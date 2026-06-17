import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LoadingFallback } from "./LoadingFallback";

describe("LoadingFallback", () => {
  it("renders web-open safe loading copy", () => {
    const html = renderToStaticMarkup(<LoadingFallback />);

    expect(html).toContain("Loading doodle arena");
    expect(html).toContain("Sketching the first round...");
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });
});
