import fs from "fs";
import path from "path";

export interface Question {
  id: string;
  title: string;
  content: string;
}

export interface Topic {
  slug: string;
  number: number;
  title: string;
  questionCount: number;
  questions: Question[];
}

export interface TopicSummary {
  slug: string;
  number: number;
  title: string;
  questionCount: number;
}

const QUESTIONS_DIR = path.join(process.cwd(), "questions");

function parseQuestionsFromMarkdown(content: string): Question[] {
  // Split by ## Q (question headings)
  const parts = content.split(/(?=^## Q\d+)/m);
  const questions: Question[] = [];

  for (const part of parts) {
    const match = part.match(/^## (Q\d+[^:\n]*(?::[^\n]*)?)\n/);
    if (!match) continue;

    const title = match[1].trim();
    const id = title.match(/Q\d+/)?.[0]?.toLowerCase() ?? "";
    const body = part.slice(match[0].length).trim();

    questions.push({ id, title, content: body });
  }

  return questions;
}

function parseTopicFromFilename(filename: string): { number: number; slug: string } {
  const match = filename.match(/^(\d+)-(.+)\.md$/);
  if (!match) return { number: 0, slug: filename };
  return {
    number: parseInt(match[1], 10),
    slug: match[2],
  };
}

function parseTitleFromContent(content: string): string {
  const match = content.match(/^#\s+(?:Topic \d+:\s+)?(.+)/m);
  return match ? match[1].trim() : "Unknown";
}

export function getAllTopics(): TopicSummary[] {
  const files = fs
    .readdirSync(QUESTIONS_DIR)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .sort();

  return files.map((file) => {
    const { number, slug } = parseTopicFromFilename(file);
    const content = fs.readFileSync(path.join(QUESTIONS_DIR, file), "utf-8");
    const title = parseTitleFromContent(content);
    const questions = parseQuestionsFromMarkdown(content);
    return { slug, number, title, questionCount: questions.length };
  });
}

export function getTopic(slug: string): Topic | null {
  const files = fs.readdirSync(QUESTIONS_DIR).filter((f) => f.endsWith(".md"));
  const file = files.find((f) => f.includes(`-${slug}.md`) || f.endsWith(`${slug}.md`));
  if (!file) return null;

  const { number } = parseTopicFromFilename(file);
  const content = fs.readFileSync(path.join(QUESTIONS_DIR, file), "utf-8");
  const title = parseTitleFromContent(content);
  const questions = parseQuestionsFromMarkdown(content);

  return { slug, number, title, questionCount: questions.length, questions };
}

export function getAllSlugs(): string[] {
  return fs
    .readdirSync(QUESTIONS_DIR)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .map((f) => parseTopicFromFilename(f).slug);
}
