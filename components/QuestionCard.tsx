"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import type { Question } from "@/lib/questions";

interface Props {
  question: Question;
  index: number;
}

const SECTION_COLORS: Record<string, string> = {
  "Trả lời Basic": "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  "Trả lời Nâng cao": "text-blue-400 bg-blue-500/10 border-blue-500/20",
  "Câu hỏi tình huống": "text-amber-400 bg-amber-500/10 border-amber-500/20",
  "Câu hỏi Trick": "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

const SECTION_LABELS: Record<string, string> = {
  "Trả lời Basic": "Basic",
  "Trả lời Nâng cao": "Nâng cao",
  "Câu hỏi tình huống": "Tình huống",
  "Câu hỏi Trick": "Trick",
};

interface Section {
  label: string;
  content: string;
}

function parseSections(content: string): { intro: string; sections: Section[] } {
  const sectionPattern = /^###\s+(Trả lời Basic|Trả lời Nâng cao|Câu hỏi tình huống|Câu hỏi Trick)/m;

  // Try ### heading format first
  if (sectionPattern.test(content)) {
    const parts = content.split(/^(?=###\s+(?:Trả lời|Câu hỏi))/m);
    const intro = parts[0].trim();
    const sections: Section[] = [];

    for (let i = 1; i < parts.length; i++) {
      const match = parts[i].match(/^###\s+(.+)\n([\s\S]*)/);
      if (match) {
        sections.push({ label: match[1].trim(), content: match[2].trim() });
      }
    }
    return { intro, sections };
  }

  // Fallback: bold heading format **Trả lời Basic**
  const boldPattern = /\*\*(Trả lời Basic|Trả lời Nâng cao|Câu hỏi tình huống|Câu hỏi Trick)\*\*/;
  if (boldPattern.test(content)) {
    const parts = content.split(/(?=\*\*(?:Trả lời|Câu hỏi))/);
    const intro = parts[0].trim();
    const sections: Section[] = [];

    for (let i = 1; i < parts.length; i++) {
      const match = parts[i].match(/^\*\*(.+?)\*\*([\s\S]*)/);
      if (match) {
        sections.push({ label: match[1].trim(), content: match[2].trim() });
      }
    }
    return { intro, sections };
  }

  return { intro: content, sections: [] };
}

export default function QuestionCard({ question, index }: Props) {
  const [open, setOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  const { intro, sections } = parseSections(question.content);

  const toggleSection = (label: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#161b22] overflow-hidden">
      {/* Question header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 px-4 py-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-500/15 border border-violet-500/20 text-xs font-bold text-violet-400 mt-0.5">
          {index + 1}
        </span>
        <span className="flex-1 text-sm font-medium text-slate-200 leading-relaxed">
          {question.title.replace(/^Q\d+:\s*/, "")}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-slate-500 mt-0.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-white/[0.06]">
          {/* Intro (if any) */}
          {intro && (
            <div className="px-4 py-3 prose-dark">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>{intro}</ReactMarkdown>
            </div>
          )}

          {/* Sections */}
          {sections.length > 0 ? (
            <div className="divide-y divide-white/[0.04]">
              {sections.map((section) => {
                const colorClass = SECTION_COLORS[section.label] ?? "text-slate-400 bg-slate-500/10 border-slate-500/20";
                const shortLabel = SECTION_LABELS[section.label] ?? section.label;
                const isOpen = openSections.has(section.label);

                return (
                  <div key={section.label}>
                    <button
                      onClick={() => toggleSection(section.label)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
                    >
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${colorClass}`}>
                        {shortLabel}
                      </span>
                      <svg
                        className={`h-3.5 w-3.5 text-slate-600 ml-auto transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 prose-dark">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>{section.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // No section headers found — render all content as-is
            <div className="px-4 pb-4 prose-dark">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>{question.content}</ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
