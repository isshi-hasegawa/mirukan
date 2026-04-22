import type { GamePlatform } from "../types.ts";
import {
  gamePlatformBackgrounds,
  gamePlatformIcons,
  gamePlatformKeys,
  gamePlatformLabels,
} from "../constants.ts";

type Props = Readonly<{
  value: GamePlatform | null;
  onChange: (value: GamePlatform | null) => void;
}>;

export function GamePlatformPicker({ value, onChange }: Props) {
  const handleClick = (platform: GamePlatform) => {
    onChange(value === platform ? null : platform);
  };

  return (
    <fieldset
      className="flex gap-2 flex-wrap border-0 p-0 m-0"
      aria-label="プレイするプラットフォーム"
    >
      {gamePlatformKeys.map((platform) => (
        <button
          key={platform}
          type="button"
          className={`relative w-11 h-11 flex items-center justify-center rounded-lg overflow-hidden cursor-pointer border-none [background-clip:padding-box] transition-shadow${value === platform ? " ring-2 ring-primary ring-inset" : ""}`}
          style={{ background: gamePlatformBackgrounds[platform] }}
          title={gamePlatformLabels[platform]}
          onClick={() => handleClick(platform)}
        >
          <img
            src={gamePlatformIcons[platform]}
            alt={gamePlatformLabels[platform]}
            className="block w-9 h-9 object-contain p-[6px]"
          />
        </button>
      ))}
    </fieldset>
  );
}
