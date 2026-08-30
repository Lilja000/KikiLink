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

  it("removes composed WCE metadata and the exact trailing Liko-MAT language flag", () => {
    expect(
      cleanBeepMessageContent(
        'Че?\n\n\uf124{"messageType":"Message","messageColor":"#C60000"}\u2063LikoMAT:en\u2063',
      ),
    ).toBe("Че?");
    expect(
      cleanBeepMessageContent(
        'Я не сохраняла\n\n\uf124{"messageType":"Message","messageColor":"#C60000"}\u2063LikoMAT:en\u2063 \n',
      ),
    ).toBe("Я не сохраняла");
  });

  it("removes standalone original and translated Liko-MAT flags", () => {
    expect(cleanBeepMessageContent("Hello\u2063LikoMAT:zh-TW\u2063")).toBe("Hello");
    expect(cleanBeepMessageContent("[🌐] Привет\u2063LikoMAT:ru:tr\u2063")).toBe(
      "[🌐] Привет",
    );
  });

  it.each(["Message", "Emote", "Action"] as const)(
    "removes the exact WCE %s metadata envelope",
    (messageType) => {
      expect(
        cleanBeepMessageContent(
          `Visible text\n\n\uf124${JSON.stringify({ messageType, messageColor: "#Aa00Ff" })}`,
        ),
      ).toBe("Visible text");
    },
  );

  it("removes the known WCE shape when its optional color is absent", () => {
    expect(
      cleanBeepMessageContent('Visible text\n\n\uf124{"messageType":"Message"}'),
    ).toBe("Visible text");
  });

  it("peels known WCE and Liko-MAT envelopes in either hook order", () => {
    const metadata = '\n\n\uf124{"messageType":"Message","messageColor":"#C60000"}';
    const mat = "\u2063LikoMAT:en\u2063";
    expect(cleanBeepMessageContent(`Visible text${metadata}${mat}`)).toBe("Visible text");
    expect(cleanBeepMessageContent(`Visible text${mat}${metadata}`)).toBe("Visible text");
  });

  it("removes Liko-MAT trailers when one invisible separator was filtered in transit", () => {
    expect(cleanBeepMessageContent("Opening only\u2063LikoMAT:en")).toBe("Opening only");
    expect(cleanBeepMessageContent("Closing onlyLikoMAT:zh-TW:tr\u2063")).toBe(
      "Closing only",
    );
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

  it("preserves malformed and near-match Liko-MAT text", () => {
    const visibleTextOnly = "Keep this LikoMAT:en";
    const wrongSignatureCasing = "Keep this \u2063likomat:en\u2063";
    const invalidLanguage = "Keep this \u2063LikoMAT:en-2\u2063";
    const oversizedLanguage = `Keep this \u2063LikoMAT:${"a".repeat(33)}\u2063`;

    expect(cleanBeepMessageContent(visibleTextOnly)).toBe(visibleTextOnly);
    expect(cleanBeepMessageContent(wrongSignatureCasing)).toBe(wrongSignatureCasing);
    expect(cleanBeepMessageContent(invalidLanguage)).toBe(invalidLanguage);
    expect(cleanBeepMessageContent(oversizedLanguage)).toBe(oversizedLanguage);
  });

  it("strips bidirectional formatting controls from visible message content", () => {
    expect(
      cleanBeepMessageContent(
        "safe\u061c\u200e\u200f\u202a\u202b\u202c\u202d\u202e\u2066\u2067\u2068\u2069text",
      ),
    ).toBe("safetext");
  });

  it("applies the native 1000-character Beep display limit after removing trailers", () => {
    expect(cleanBeepMessageContent("a".repeat(1_001))).toHaveLength(1_000);
    expect(
      cleanBeepMessageContent(
        `${"b".repeat(1_000)}\n\n\uf124{"messageType":"Message","messageColor":"#ffffff"}\u2063LikoMAT:en\u2063`,
      ),
    ).toBe("b".repeat(1_000));
  });
});
