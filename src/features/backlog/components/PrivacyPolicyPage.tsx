import { ArrowLeftIcon } from "@heroicons/react/24/outline";

const BUG_REPORT_URL = "https://github.com/isshi-hasegawa/mirukan/issues/new/choose";

const sections = [
  {
    title: "第1条（事業者）",
    body: [
      "本ポリシーは、「みるカン」運営者（以下「運営者」といいます。）が提供するサービス「みるカン」（以下「本サービス」といいます。）に適用されます。",
    ],
  },
  {
    title: "第2条（取得する情報）",
    body: ["運営者は、本サービスにおいて、次の情報を取得することがあります。"],
    items: [
      "アカウント登録およびログインに必要なメールアドレス、認証関連情報",
      "作品の登録内容、視聴状態、メモ、表示設定その他ユーザーが本サービスへ入力した情報",
      "サービス提供に伴って自動的に取得される利用履歴、アクセス元情報、端末情報、エラー情報その他のログ情報",
      "認証状態の維持等のためにブラウザへ保存されるセッション情報、Cookie に類する識別子またはローカルストレージ上の情報",
      "お問い合わせ時にユーザーが任意に提供した情報",
    ],
  },
  {
    title: "第3条（利用目的）",
    body: ["運営者は、取得した情報を次の目的で利用します。"],
    items: [
      "本サービスの提供、本人確認、アカウント管理および認証処理のため",
      "バックログ情報の保存、表示、編集、並び替えその他本サービスの主要機能を提供するため",
      "障害調査、不正利用対策、セキュリティ向上および品質改善のため",
      "お問い合わせ対応または重要なお知らせのため",
      "利用規約違反その他不適切な利用への対応のため",
      "上記に付随する目的のため",
    ],
  },
  {
    title: "第4条（外部サービスの利用）",
    body: [
      "本サービスでは、サービス提供のために外部サービスを利用しています。外部サービス事業者に対して、利用に必要な範囲で情報が送信されることがあります。",
    ],
    items: [
      "Supabase: 認証、データ保存、Edge Functions 実行のため",
      "TMDB: 作品情報、画像、関連メタデータの取得のため",
    ],
  },
  {
    title: "第5条（第三者提供）",
    body: [
      "運営者は、法令に基づく場合を除き、本人の同意なく個人情報を第三者へ提供しません。",
      "ただし、本サービスの提供に必要な範囲で外部サービス事業者へ情報を取り扱わせる場合があります。この場合、運営者は適切な委託先またはサービス提供者を選定し、必要な範囲でのみ利用します。",
    ],
  },
  {
    title: "第6条（保存期間）",
    body: [
      "運営者は、取得した情報を、利用目的の達成に必要な期間または法令上必要な期間保存し、その後は適切な方法で削除または匿名化します。",
      "ユーザーがアカウント削除を求めた場合でも、法令対応、不正利用対策、バックアップ整合性確保その他合理的に必要な範囲で一定期間情報を保持することがあります。",
    ],
  },
  {
    title: "第7条（安全管理措置）",
    body: [
      "運営者は、個人情報への不正アクセス、漏えい、滅失または毀損の防止その他の安全管理のため、認証基盤の利用、アクセス制御その他合理的な措置を講じます。",
      "ただし、インターネット通信およびクラウドサービスの性質上、完全な安全性を保証するものではありません。",
    ],
  },
  {
    title: "第8条（開示・訂正・利用停止・削除）",
    body: [
      "ユーザーは、運営者が保有する自己の個人情報について、法令の定めに従い、開示、訂正、追加、削除、利用停止等を求めることができます。",
      "請求を受けた場合、運営者は本人確認を行った上で、法令に従い合理的な期間内に対応します。",
    ],
  },
  {
    title: "第9条（プライバシーポリシーの変更）",
    body: [
      "運営者は、法令の変更、本サービス内容の変更その他必要に応じて、本ポリシーを変更することがあります。",
      "変更後の本ポリシーは、本サービス上に掲載した時点または別途示した効力発生日から効力を生じます。",
    ],
  },
  {
    title: "第10条（お問い合わせ窓口）",
    body: [
      "本ポリシーに関するお問い合わせ、不具合報告、開示等の請求は、以下の窓口で受け付けます。",
      "メールアドレス: support@mirukan.app",
      "GitHub Issues: https://github.com/isshi-hasegawa/mirukan/issues",
      "運営者は、必要に応じて本サービスまたはリポジトリ上で別途連絡手段を案内することがあります。",
    ],
  },
] as const;

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-[760px] px-6 py-10 max-[720px]:px-5 max-[720px]:py-8">
        <a
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          みるカンに戻る
        </a>

        <header className="mb-8 grid gap-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Privacy</p>
          <h1 className="text-lg font-semibold text-foreground">プライバシーポリシー</h1>
          <div className="text-sm text-muted-foreground">
            <p>制定日: 2026年4月4日</p>
            <p>改定日: 2026年4月5日</p>
          </div>
        </header>

        <div className="grid gap-5 text-sm leading-7 text-muted-foreground">
          <p>
            本ポリシーは、「みるカン」におけるユーザー情報の取扱いを定めるものです。運営者は、本ポリシーに従ってユーザー情報を取り扱います。
          </p>

          {sections.map((section) => (
            <section key={section.title} className="grid gap-2">
              <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
              {section.body.map((paragraph) =>
                paragraph.startsWith("メールアドレス: ") ? (
                  <p key={paragraph}>
                    メールアドレス:{" "}
                    <a
                      href="mailto:support@mirukan.app"
                      className="underline decoration-muted-foreground/40 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/60"
                    >
                      support@mirukan.app
                    </a>
                  </p>
                ) : paragraph.startsWith("GitHub Issues: ") ? (
                  <p key={paragraph}>
                    GitHub Issues:{" "}
                    <a
                      href={BUG_REPORT_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-muted-foreground/40 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/60"
                    >
                      github.com/isshi-hasegawa/mirukan/issues
                    </a>
                  </p>
                ) : (
                  <p key={paragraph}>{paragraph}</p>
                ),
              )}
              {"items" in section ? (
                <ul className="grid gap-2 pl-5 list-disc">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
