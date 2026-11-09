import "server-only";

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ChapterContentSchema, type ChapterContent } from "@/lib/schemas";
import { padChapter } from "@/lib/utils";

export const GENESIS_BOOKS = {
  "genesis": {
    slug: "genesis",
    name: "Genesis",
    chapterCount: 50,
    verseCounts: [31, 25, 24, 26, 32, 22, 24, 22, 29, 32, 32, 20, 18, 24, 21, 16, 27, 33, 38, 18, 34, 24, 20, 67, 34, 35, 46, 22, 35, 43, 55, 32, 20, 31, 29, 43, 36, 30, 23, 23, 57, 38, 34, 34, 28, 34, 31, 22, 33, 26]
  }
} as const;

export type GenesisBookSlug = keyof typeof GENESIS_BOOKS;
export type GenesisBookConfig = (typeof GENESIS_BOOKS)[GenesisBookSlug];

export type ChapterAdjacency = {
  previous: number | null;
  next: number | null;
};

const contentRoot = join(process.cwd(), "content");

export function getGenesisBookConfig(bookSlug: GenesisBookSlug): GenesisBookConfig {
  return GENESIS_BOOKS[bookSlug];
}

export function getGenesisStaticParams(bookSlug: GenesisBookSlug) {
  const { chapterCount } = getGenesisBookConfig(bookSlug);
  return Array.from({ length: chapterCount }, (_, index) => ({ chapter: String(index + 1) }));
}

export function parseGenesisChapterNumber(
  bookSlug: GenesisBookSlug,
  chapter: number | string
): number | null {
  const rawChapter = String(chapter);
  if (!/^[1-9]\d*$/.test(rawChapter)) return null;

  const chapterNumber = Number(rawChapter);
  const { chapterCount } = getGenesisBookConfig(bookSlug);
  if (!Number.isSafeInteger(chapterNumber) || chapterNumber > chapterCount) return null;

  return chapterNumber;
}

export function getGenesisChapter(
  bookSlug: GenesisBookSlug,
  chapter: number | string
): ChapterContent | null {
  const chapterNumber = parseGenesisChapterNumber(bookSlug, chapter);
  if (chapterNumber === null) return null;

  const config = getGenesisBookConfig(bookSlug);
  const chapterPath = join(contentRoot, config.slug, `chapter-${padChapter(chapterNumber)}.json`);
  if (!existsSync(chapterPath)) return null;

  const parsed = ChapterContentSchema.parse(JSON.parse(readFileSync(chapterPath, "utf8")));
  const expectedVerseCount = config.verseCounts[chapterNumber - 1];

  if (parsed.chapterNumber !== chapterNumber) {
    throw new Error(
      `${config.name} ${chapterNumber} loaded chapterNumber ${parsed.chapterNumber}.`
    );
  }

  if (parsed.verses.length !== expectedVerseCount) {
    throw new Error(
      `${config.name} ${chapterNumber} has ${parsed.verses.length} verses; expected ${expectedVerseCount}.`
    );
  }

  parsed.verses.forEach((verse, index) => {
    const expectedReference = `${config.name} ${chapterNumber}:${index + 1}`;
    if (verse.verse !== expectedReference) {
      throw new Error(
        `${config.name} ${chapterNumber} contains ${verse.verse}; expected ${expectedReference}.`
      );
    }
  });

  return parsed;
}

export function getGenesisChapterAdjacency(
  bookSlug: GenesisBookSlug,
  chapter: number | string
): ChapterAdjacency | null {
  const chapterNumber = parseGenesisChapterNumber(bookSlug, chapter);
  if (chapterNumber === null) return null;

  const { chapterCount } = getGenesisBookConfig(bookSlug);
  return {
    previous: chapterNumber > 1 ? chapterNumber - 1 : null,
    next: chapterNumber < chapterCount ? chapterNumber + 1 : null
  };
}
