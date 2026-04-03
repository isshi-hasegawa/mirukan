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
      <section className="relative overflow-hidden rounded-[34px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(145deg,rgba(66,41,24,0.9),rgba(27,24,22,0.96)_58%,rgba(18,18,18,0.98))] px-7 py-8 shadow-[0_30px_80px_rgba(0,0,0,0.4)] lg:px-9 lg:py-9">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 top-5 h-28 rounded-full bg-[radial-gradient(circle,rgba(255,171,95,0.16),transparent_72%)] blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 bottom-[-62px] h-44 w-44 rounded-full border border-[rgba(255,255,255,0.06)] bg-[radial-gradient(circle_at_35%_35%,rgba(255,140,66,0.22),rgba(255,140,66,0.04)_58%,transparent_72%)]"
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
