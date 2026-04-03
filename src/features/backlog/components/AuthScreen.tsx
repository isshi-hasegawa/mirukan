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
    <main className="mx-auto grid min-h-svh w-[min(1420px,calc(100%-32px))] content-center grid-cols-1 gap-5 py-6 login-cols lg:gap-6">
      <section className="relative overflow-hidden rounded-[34px] border border-[rgba(255,255,255,0.08)] bg-[rgba(24,22,21,0.96)] px-7 py-8 shadow-[0_30px_80px_rgba(0,0,0,0.4)] lg:px-9 lg:py-9">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-10 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(255,140,66,0.12),transparent_72%)] blur-3xl"
        />
        <div className="relative">
        {badge ? (
          <p className="mb-3 text-[0.72rem] font-bold tracking-[0.22em] uppercase text-orange-300/90">
            {badge}
          </p>
        ) : null}
        {title ? (
          <h1 className="text-[clamp(2.5rem,4.5vw,4.4rem)] leading-[0.94] tracking-[-0.05em] font-[var(--heading)] text-foreground">
            {title}
          </h1>
        ) : null}
        {description ? (
          <p className="mt-5 max-w-[58ch] text-[1rem] leading-7 text-[rgba(255,255,255,0.72)]">
            {description}
          </p>
        ) : null}
          {sideContent ? <div className="mt-8">{sideContent}</div> : null}
        </div>
      </section>

      <section className="lg:self-center rounded-[30px] border border-[rgba(255,255,255,0.08)] bg-[rgba(22,22,22,0.92)] p-7 shadow-[0_28px_70px_rgba(0,0,0,0.42)] backdrop-blur-xl lg:p-8">
        {children}
      </section>
    </main>
  );
}
