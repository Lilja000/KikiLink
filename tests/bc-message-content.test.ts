import { describe, expect, it } from "vitest";
import { cleanBeepMessageContent } from "../src/bc/message-content";

describe("cleanBeepMessageContent", () => {
  it("removes the trailing display metadata reported by compatible Beep senders", () => {
    expect(
      cleanBeepMessageContent(
        'Привки привки\n\n\uf124{"messageType":"Message","messageColor":"#ffffff"}',
      ),
    ).toBe("Привки привки");
  });

  it("accepts harmless whitespace and hex letter casing in the exact metadata envelope", () => {
    expect(
      cleanBeepMessageContent(
        'Hello\uf124  {"messageColor":"#AaBbCc","messageType":"Message"}  ',
      ),
    ).toBe("Hello");
  });

  it("preserves marker-like user text unless it matches the complete known signature", () => {
    const unrelated = 'Keep this \uf124{"messageType":"Note","messageColor":"#ffffff"}';
    const extraField =
      'Keep this too \uf124{"messageType":"Message","messageColor":"#ffffff","extra":true}';
    const invalidJson = 'And this \uf124{"messageType":"Message"';

    expect(cleanBeepMessageContent(unrelated)).toBe(unrelated);
    expect(cleanBeepMessageContent(extraField)).toBe(extraField);
    expect(cleanBeepMessageContent(invalidJson)).toBe(invalidJson);
  });

  it("retains the native 1000-character Beep display limit", () => {
    expect(cleanBeepMessageContent("a".repeat(1_001))).toHaveLength(1_000);
  });
});
