import mirukanSymbolUrl from "../../../assets/brand/mirukan_symbol_primary_tight.png";

type Props = {
  className?: string;
  subtitleClassName?: string;
  symbolClassName?: string;
};

export function BrandWordmark({ className, subtitleClassName, symbolClassName }: Props) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <img
        src={mirukanSymbolUrl}
        alt="みるカンのシンボル"
        className={symbolClassName ?? "h-18 w-18 shrink-0 object-contain"}
      />
      <div className="min-w-0">
        <span className="block text-[clamp(2rem,4vw,3.6rem)] leading-[0.9] tracking-[-0.08em] text-white">
          みるカン
        </span>
        <span
          className={
            subtitleClassName ??
            "mt-1.5 block text-[0.72rem] font-medium tracking-[0.24em] text-white/48 uppercase"
          }
        >
          mirukan
        </span>
      </div>
    </div>
  );
}
