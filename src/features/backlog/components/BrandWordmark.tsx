type Props = {
  className?: string;
  subtitleClassName?: string;
};

export function BrandWordmark({ className, subtitleClassName }: Props) {
  return (
    <div className={className}>
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
  );
}
