import Image from "next/image";
import type { StoreUiStrings } from "@/lib/i18n/store-ui";

const DEVELOPER_EMAIL = "sales@yyautomationapp.com";

export default function DeveloperFooter({ t }: { t: StoreUiStrings }) {
  return (
    <section
      className="mt-6 rounded-xl border border-gray-200/80 bg-white px-4 py-5 text-center shadow-sm"
      aria-label={t.developerFooterAria}
    >
      <div className="mx-auto flex max-w-xs flex-col items-center gap-3">
        <Image
          src="/yyautomation-logo.png"
          alt="yyautomation"
          width={56}
          height={56}
          className="h-14 w-14 rounded-full object-cover shadow-sm"
        />
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-700">{t.developerFooterLine1}</p>
          <p className="text-[11px] leading-relaxed text-gray-500">
            {t.developerFooterLine2}
          </p>
        </div>
        <a
          href={`mailto:${DEVELOPER_EMAIL}`}
          className="text-[11px] font-medium text-emerald-700 underline-offset-2 hover:underline"
        >
          {t.developerFooterContact}: {DEVELOPER_EMAIL}
        </a>
      </div>
    </section>
  );
}
