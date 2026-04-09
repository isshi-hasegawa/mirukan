import { setupTestLifecycle } from "./test/test-lifecycle.ts";
import { getAppRootElement } from "./getAppRootElement.ts";

setupTestLifecycle();

describe("getAppRootElement", () => {
  test("既存の app 要素があればそれを返す", () => {
    document.body.innerHTML = '<div id="app"></div>';

    const root = getAppRootElement();

    expect(root).toBe(document.getElementById("app"));
    expect(document.querySelectorAll("#app")).toHaveLength(1);
  });

  test("app 要素がなければ fallback を作成する", () => {
    document.body.innerHTML = '<main id="content"></main>';

    const root = getAppRootElement();

    expect(root.id).toBe("app");
    expect(document.body.firstElementChild).toBe(root);
    expect(document.querySelectorAll("#app")).toHaveLength(1);
  });
});
