import { getAllPrincipleTopics } from "@/lib/principles";
import Link from "next/link";

const TOPIC_ICONS: Record<string, string> = {
  "generic-principles": "🧭",
  "solid-principles": "🏛️",
  "module-design": "🔧",
  "testing-principles": "🧪",
};

export default function PreparingPage() {
  const topics = getAllPrincipleTopics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Interview Preparing</h1>
        <p className="text-xs text-slate-500 mt-1">
          Programming principles — đơn giản, dễ hiểu, với use cases thực tế
        </p>
      </div>

      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 text-xs text-violet-300 leading-relaxed">
        Tổng hợp từ{" "}
        <span className="font-semibold text-violet-200">webpro/programming-principles</span>{" "}
        và các tài liệu kinh điển. Mỗi nguyên tắc có giải thích đơn giản, use case thực tế, và câu hỏi so sánh khi các pattern liên quan nhau.
      </div>

      <div className="space-y-2">
        {topics.map((topic) => {
          const icon = TOPIC_ICONS[topic.slug] ?? "📖";
          return (
            <Link
              key={topic.slug}
              href={`/preparing/${topic.slug}`}
              className="flex items-center gap-4 rounded-xl border border-white/[0.07] bg-[#161b22] px-4 py-3.5 hover:border-violet-500/30 hover:bg-[#1a2035] transition-all group"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-500/20 text-base">
                {icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                  {topic.title}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {topic.questionCount} nguyên tắc
                </p>
              </div>
              <svg
                className="h-4 w-4 shrink-0 text-slate-600 group-hover:text-slate-400 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
