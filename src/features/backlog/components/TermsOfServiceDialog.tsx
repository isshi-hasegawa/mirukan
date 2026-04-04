import { XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect } from "react";
import { createPortal } from "react-dom";

type Props = {
  onClose: () => void;
};

const sections = [
  {
    title: "第1条（適用）",
    body: [
      "本規約は、みるカン（以下「本サービス」といいます。）の利用条件を定めるものです。本サービスを利用するユーザーは、本規約に従って本サービスを利用するものとします。",
      "本サービスに関して本規約のほかに個別の案内、ヘルプ、注意事項その他のルールを表示した場合、それらは本規約の一部を構成します。",
    ],
  },
  {
    title: "第2条（運営者）",
    body: [
      "本サービスは、本サービス運営者（以下「運営者」といいます。）が提供します。",
    ],
  },
  {
    title: "第3条（利用登録）",
    body: [
      "本サービスは、運営者が定める方法でアカウント登録を行ったユーザーのみ利用できます。",
      "運営者は、登録申請者に次のいずれかの事由があると判断した場合、登録を承認しないことがあります。",
    ],
    items: [
      "登録事項に虚偽、誤記または記入漏れがあった場合",
      "過去に本規約へ違反したことがある場合",
      "その他、運営者が利用登録を相当でないと判断した場合",
    ],
  },
  {
    title: "第4条（アカウント管理）",
    body: [
      "ユーザーは、自己の責任において、本サービスのログイン情報を適切に管理するものとします。",
      "ユーザーの管理不十分、使用上の過誤または第三者の使用によって生じた損害について、運営者は運営者に故意または重過失がある場合を除き責任を負いません。",
    ],
  },
  {
    title: "第5条（本サービスの内容）",
    body: [
      "本サービスは、映画、TVシリーズその他の映像作品について、視聴候補の整理、状態管理および関連情報の参照を行うためのバックログ管理サービスです。",
      "本サービスに表示される作品情報、画像その他のデータには、第三者が提供する情報が含まれる場合があります。運営者は、その正確性、完全性または最新性を保証しません。",
    ],
  },
  {
    title: "第6条（禁止事項）",
    body: ["ユーザーは、本サービスの利用にあたり、次の行為をしてはなりません。"],
    items: [
      "法令または公序良俗に違反する行為",
      "犯罪行為またはこれに関連する行為",
      "本サービス、運営者または第三者の知的財産権、プライバシー権その他の権利利益を侵害する行為",
      "本サービスのサーバー、ネットワークまたはシステムに過度な負荷をかける行為",
      "不正アクセスまたはこれを試みる行為",
      "本サービスの運営を妨害する行為",
      "本サービスを通じて取得した情報を、本サービスの利用目的の範囲を超えて無断で商業利用する行為",
      "他のユーザーまたは第三者に不利益、損害または不快感を与える行為",
      "反社会的勢力に対する利益供与その他これに類する行為",
      "その他、運営者が不適切と判断する行為",
    ],
  },
  {
    title: "第7条（登録情報・投稿内容）",
    body: [
      "ユーザーは、登録情報、メモ、表示名その他本サービスに入力する内容について、自ら適法に利用できる情報のみを入力するものとします。",
      "ユーザーは、運営者に対し、本サービスの提供、保守、改善、不具合調査およびサポート対応に必要な範囲で、当該入力内容を利用する権限を許諾するものとします。",
    ],
  },
  {
    title: "第8条（サービスの停止・変更・終了）",
    body: [
      "運営者は、システム保守、障害対応、外部サービスの停止、不可抗力その他やむを得ない事由がある場合、ユーザーに事前通知なく本サービスの全部または一部を停止または中断できるものとします。",
      "運営者は、ユーザーへの告知の上で、本サービスの内容を変更し、または提供を終了することがあります。",
    ],
  },
  {
    title: "第9条（利用制限および登録抹消）",
    body: [
      "運営者は、ユーザーが本規約に違反した場合その他本サービスの利用を適当でないと判断した場合、事前通知なく、当該ユーザーによる利用を制限し、または登録を抹消できるものとします。",
    ],
  },
  {
    title: "第10条（保証の否認・免責）",
    body: [
      "運営者は、本サービスに事実上または法律上の瑕疵がないこと、本サービスが特定の目的に適合すること、継続的に利用できること、または特定の結果を生じさせることを保証しません。",
      "運営者は、本サービスに起因してユーザーに生じた損害について、運営者に故意または重過失がある場合を除き、責任を負いません。",
      "消費者契約法その他の法令により前項の免責が制限される場合、運営者の責任は、運営者の軽過失によって直接かつ通常生じた損害に限られるものとします。",
    ],
  },
  {
    title: "第11条（知的財産権）",
    body: [
      "本サービスに関する著作権その他の知的財産権は、運営者または正当な権利者に帰属します。ユーザーは、法令で認められる範囲を超えてこれらを利用してはなりません。",
    ],
  },
  {
    title: "第12条（個人情報の取扱い）",
    body: [
      "運営者は、本サービスの利用により取得した個人情報を、別途定めるプライバシーポリシーに従って取り扱います。",
    ],
  },
  {
    title: "第13条（規約の変更）",
    body: [
      "運営者は、必要と判断した場合、民法その他の法令に従って本規約を変更できます。",
      "変更後の規約は、本サービス上に表示した時点または別途示した効力発生日から効力を生じます。",
    ],
  },
  {
    title: "第14条（準拠法・裁判管轄）",
    body: [
      "本規約の解釈には日本法を準拠法とします。",
      "本サービスに関して紛争が生じた場合、運営者の住所地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。",
    ],
  },
] as const;

export function TermsOfServiceDialog({ onClose }: Props) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(51,34,23,0.45)] p-5 backdrop-blur-[10px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-of-service-title"
        className="w-[min(calc(100%-32px),760px)] rounded-[28px] border border-border bg-[#2a2a2a] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.5)] max-[720px]:rounded-[22px] max-[720px]:p-5"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="grid gap-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Terms</p>
            <h2 id="terms-of-service-title" className="text-xl font-semibold text-foreground">
              利用規約
            </h2>
            <div className="text-sm text-muted-foreground">
              <p>制定日: 2026年4月4日</p>
              <p>改定日: 2026年4月5日</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="利用規約を閉じる"
            className="rounded-full border border-border bg-background/40 p-2 text-muted-foreground transition-colors hover:text-foreground"
            onClick={onClose}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[min(70vh,720px)] overflow-y-auto pr-1">
          <div className="grid gap-5 text-sm leading-7 text-muted-foreground">
            <p>
              この利用規約（以下「本規約」といいます。）は、「みるカン」の利用条件を定めるものです。ユーザーは、本規約に同意した上で本サービスを利用するものとします。
            </p>

            {sections.map((section) => (
              <section key={section.title} className="grid gap-2">
                <h3 className="text-base font-semibold text-foreground">{section.title}</h3>
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
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
      </section>
    </div>,
    document.body,
  );
}
