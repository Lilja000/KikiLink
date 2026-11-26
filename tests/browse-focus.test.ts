// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { preserveSelectionFocus } from "../src/modules/platform-shell/browse-focus";

import { focusPageResults, pageResult } from "../src/modules/platform-shell/page-result-focus";
import { pageAction } from "../src/modules/platform-shell/page-action";

afterEach(() => document.body.replaceChildren());

it.each([false, true])("respects a user's keyboard navigation during a pending sort (moved=%s)", async moved => {
  const host = document.createElement("div");
  document.body.append(host);
  const shadow = host.attachShadow({ mode: "open" });
  const toolbar = document.createElement("div");
  const sort = document.createElement("select");
  sort.setAttribute("aria-label", "Sort catalogue");
  const other = document.createElement("button");
  shadow.append(toolbar, other);
  toolbar.append(sort);
  sort.focus();

  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  const replacement = sort.cloneNode(true) as HTMLSelectElement;
  const updating = preserveSelectionFocus(toolbar, async () => {
    sort.remove();
    await pending;
    toolbar.append(replacement);
  });
  if (moved) {
    other.focus();
    // Simulate a separate action removing its trigger before the catalogue responds.
    other.remove();
  }
  release();
  await updating;
  expect(shadow.activeElement === replacement).toBe(!moved);
});

it.each([false, true])("only moves to the new page if the user stayed on the chosen direction (changed=%s)", async changed => {
  const list = document.createElement("section");
  document.body.append(list);
  const previous = pageAction(document.createElement("button"), "previous");
  const following = pageAction(document.createElement("button"), "next");
  const old = pageResult(document.createElement("button"), "old");
  const added = pageResult(document.createElement("button"), "new");
  list.append(old, previous, following);
  following.focus();
  let finish!: () => void;
  const pending = new Promise<void>(resolve => { finish = resolve; });
  const load = focusPageResults(list, async () => {
    following.remove();
    await pending;
    list.prepend(added);
  });
  if (changed) {
    previous.focus();
    previous.remove();
  }
  finish();
  await load;
  expect(document.activeElement === added).toBe(!changed);
});
