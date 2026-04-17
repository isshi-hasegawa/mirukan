import { render, screen } from "@testing-library/react";
import { PlatformIcon } from "./PlatformIcon.tsx";
import { platformBackgrounds, platformIcons, platformLabels } from "../constants.ts";

describe("PlatformIcon", () => {
  test("選択されたプラットフォームのアイコン情報を表示する", () => {
    render(<PlatformIcon platform="netflix" />);

    const icon = screen.getByRole("img", { name: platformLabels.netflix });
    expect(icon).toHaveAttribute("src", platformIcons.netflix);
    expect(icon).toHaveAttribute("title", platformLabels.netflix);
    expect(icon).toHaveStyle({ background: platformBackgrounds.netflix });
  });
});
