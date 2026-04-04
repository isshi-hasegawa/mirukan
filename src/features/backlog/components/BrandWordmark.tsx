type Props = {
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  symbolClassName?: string;
};

export function BrandWordmark({
  className,
  titleClassName,
  subtitleClassName,
  symbolClassName,
}: Props) {
  return (
    <div className={`flex items-center gap-4 ${className ?? ""}`}>
      <img
        src="/brand/mirukan-symbol.png"
        alt="みるカンのシンボル"
        className={symbolClassName ?? "h-18 w-18 shrink-0 object-contain"}
      />
      <div className="min-w-0">
        <span
          className={
            titleClassName ??
            "block whitespace-nowrap text-[clamp(2.1rem,4.2vw,3.8rem)] leading-[0.88] tracking-[-0.08em] text-white"
          }
        >
          みるカン
        </span>
        <span
          className={
            subtitleClassName ??
            "mt-1.5 block whitespace-nowrap text-[0.68rem] font-medium tracking-[0.22em] text-white/38 uppercase"
          }
        >
          mirukan
        </span>
      </div>
    </div>
  );
}
