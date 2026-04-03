import type { ReactNode } from "react";

type Props = {
  badge?: string;
  title?: string;
  description?: string;
  sideContent?: ReactNode;
  children: ReactNode;
};

export function AuthScreen({ badge, title, description, sideContent, children }: Props) {
  return (
    <main className="grid min-h-svh w-[min(1680px,calc(100%-20px))] mx-auto content-center grid-cols-1 login-cols gap-[18px] lg:items-start py-[14px]">
      <section className="border border-border bg-card/95 backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.5)] rounded-[28px] p-7">
        {badge ? (
          <p className="mb-2.5 text-[0.78rem] font-bold tracking-[0.18em] uppercase text-orange-400">
            {badge}
          </p>
        ) : null}
        {title ? (
          <h1 className="text-[clamp(2.6rem,5vw,4.8rem)] leading-[0.95] tracking-[-0.05em] font-[var(--heading)] text-foreground">
            {title}
          </h1>
        ) : null}
        {description ? (
          <p className="mt-[18px] max-w-[58ch] text-muted-foreground text-[1.02rem]">
            {description}
          </p>
        ) : null}
        {sideContent ? <div className="mt-7">{sideContent}</div> : null}
      </section>

      <section className="lg:self-center border border-border bg-card/95 backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.5)] rounded-[28px] p-7">
        {children}
      </section>
    </main>
  );
}
