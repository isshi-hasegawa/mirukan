import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import tmdbLogoUrl from "../../../assets/logos/tmdb.svg";
import { DialogShell } from "./DialogShell.tsx";

type Props = Readonly<{
  onClose: () => void;
}>;

export function AboutDialog({ onClose }: Props) {
  return (
    <DialogShell
      titleId="about-dialog-title"
      badge="About"
      title="みるカンについて"
      closeLabel="About を閉じる"
      onClose={onClose}
    >
      <div className="grid gap-5 text-sm leading-7 text-muted-foreground">
        <section className="grid gap-2">
          <p className="text-base leading-7 text-foreground">
            みるカンは、積んだ映画・シリーズ・ゲームから次に手をつける一本を決めるためのバックログです。
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-3">
              <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-primary uppercase">
                Stack
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">候補を積む</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-3">
              <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-primary uppercase">
                Sort
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">状態で並べる</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-3">
              <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-primary uppercase">
                Decide
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">次の一本を決める</p>
            </div>
          </div>
          <p className="text-sm leading-6">
            「積んではいるけど、何を見るか決まらない」を減らすために、視聴状態の整理と次の候補選びに絞っています。
          </p>
        </section>

        <section className="grid gap-2 rounded-[20px] border border-[rgba(191,90,54,0.2)] bg-[rgba(191,90,54,0.07)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Data Source
          </p>
          <div className="inline-flex w-fit items-center rounded-2xl bg-white px-4 py-3 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]">
            <img src={tmdbLogoUrl} alt="TMDB" className="h-5 w-auto sm:h-6" />
          </div>
          <p className="text-sm leading-6 text-foreground">
            TMDB のデータおよび画像を利用しています。作品情報の参照元は TMDB です。
          </p>
          <p className="text-sm leading-6">
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground underline decoration-muted-foreground/40 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/60 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
          >
            <span>https://www.themoviedb.org/</span>
            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          </a>
        </section>

        <section className="grid gap-2 rounded-[20px] border border-[rgba(191,90,54,0.2)] bg-[rgba(191,90,54,0.07)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Game Data
          </p>
          <p className="text-sm leading-6 text-foreground">
            ゲーム情報は IGDB.com を参照しています。IGDB API
            を組み込むプロダクトでは、ユーザーから見える固定位置での IGDB.com
            帰属表記が求められています。
          </p>
          <p className="text-sm leading-6">
            Authentication and API access are provided through the Twitch Developer platform.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <a
              href="https://www.igdb.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground underline decoration-muted-foreground/40 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/60 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            >
              <span>https://www.igdb.com/</span>
              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </a>
            <a
              href="https://dev.twitch.tv/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground underline decoration-muted-foreground/40 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/60 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            >
              <span>https://dev.twitch.tv/</span>
              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </a>
          </div>
        </section>
      </div>
    </DialogShell>
  );
}
