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
    <main className="mx-auto grid min-h-svh w-[min(640px,calc(100%-32px))] content-center gap-8 pt-10 pb-6 sm:pt-14 sm:pb-8">
      <section className="grid gap-4">
        {badge ? (
          <p className="text-[0.72rem] font-bold tracking-[0.22em] uppercase text-orange-300/90">
            {badge}
          </p>
        ) : null}
        {title ? (
          <h1 className="text-[clamp(2.5rem,4.5vw,4.4rem)] leading-[0.94] tracking-[-0.05em] font-[var(--heading)] text-foreground">
            {title}
          </h1>
        ) : null}
        {description ? (
          <p className="max-w-[58ch] text-[1rem] leading-7 text-[rgba(255,255,255,0.72)]">
            {description}
          </p>
        ) : null}
        {sideContent}
      </section>

      <section className="rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[rgba(22,22,22,0.92)] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.36)] backdrop-blur-xl sm:p-7">
        {children}
      </section>
    </main>
  );
}
