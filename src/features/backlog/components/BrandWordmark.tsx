import mirukanSymbolUrl from "../../../assets/brand/mirukan_symbol_primary_tight.png";

type Props = {
  className?: string;
  subtitleClassName?: string;
  symbolClassName?: string;
};

export function BrandWordmark({ className, subtitleClassName, symbolClassName }: Props) {
  return (
    <div className={`flex items-center gap-4 ${className ?? ""}`}>
      <img
        src={mirukanSymbolUrl}
        alt="みるカンのシンボル"
        className={symbolClassName ?? "h-18 w-18 shrink-0 object-contain"}
      />
      <div className="min-w-0">
        <span className="block text-[clamp(2.1rem,4.2vw,3.8rem)] leading-[0.88] tracking-[-0.08em] text-white">
          みるカン
        </span>
        <span
          className={
            subtitleClassName ??
            "mt-1.5 block text-[0.68rem] font-medium tracking-[0.22em] text-white/38 uppercase"
          }
        >
          mirukan
        </span>
      </div>
    </div>
  );
}
