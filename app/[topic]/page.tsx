import { getTopic, getAllSlugs } from "@/lib/questions";
import QuestionCard from "@/components/QuestionCard";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ topic: slug }));
}

export async function generateMetadata({ params }: { params: { topic: string } }) {
  const topic = getTopic(params.topic);
  if (!topic) return {};
  return { title: `${topic.title} — Interview Coach` };
}

export default function TopicPage({ params }: { params: { topic: string } }) {
  const topic = getTopic(params.topic);
  if (!topic) notFound();

  return (
    <div className="space-y-5">
      {/* Back + header */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors mb-4"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Tất cả topics
        </Link>
        <h1 className="text-lg font-bold text-slate-100">{topic.title}</h1>
        <p className="text-xs text-slate-500 mt-1">{topic.questionCount} câu hỏi</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-emerald-400 font-medium">Basic</span>
        <span className="inline-flex items-center gap-1 rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-blue-400 font-medium">Nâng cao</span>
        <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-amber-400 font-medium">Tình huống</span>
        <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-rose-400 font-medium">Trick</span>
      </div>

      {/* Questions */}
      <div className="space-y-2">
        {topic.questions.map((q, i) => (
          <QuestionCard key={q.id} question={q} index={i} />
        ))}
      </div>
    </div>
  );
}
