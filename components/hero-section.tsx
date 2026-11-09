/* eslint-disable @next/next/no-html-link-for-pages -- Full document navigation is intentional for the static Pages export. */

import {
  ArrowRight,
  BookOpen,
  BookOpenCheck
} from "lucide-react";

const studyActions = [
  {
    title: "Introduction",
    href: "/background/",
    description: "Explore Moses as author, the world of the patriarchs, the structure of Genesis, and the great controversy that begins in Eden.",
    icon: BookOpenCheck
  },
  {
    title: "Genesis",
    href: "/genesis/1/",
    description: "Read the fifty-chapter study of creation, the fall, the flood, and God's covenant with Abraham and his family.",
    icon: BookOpen
  }
] as const;

const bookPlans = [
  {
    id: "genesis",
    slug: "genesis",
    eyebrow: "First Book of Moses · undefined Chapters",
    title: "Genesis",
    chapterCount: 50
  }
] as const;

export function HeroSection() {
  return (
    <section className="home-showcase">
      <div className="home-showcase-shell">
        <section className="home-showcase-hero" aria-labelledby="home-title">
          <div className="home-showcase-copy">
            <p className="home-title-prefix">The Book of</p>
            <h1 id="home-title">Genesis</h1>
            <p className="home-showcase-description">
              {"Enter the book of beginnings, where God creates a very good world and rests on the seventh day, sin breaks in, and the promised Seed carries hope from Eden through Noah, Abraham, Isaac, Jacob, and Joseph."}
            </p>
            <div className="home-showcase-actions">
              <a href="/genesis/1/" className="home-showcase-primary">
                Explore Genesis
                <ArrowRight className="h-4 w-4" />
              </a>
              <a href="/background/" className="home-showcase-secondary">
                Read the Introduction
              </a>
            </div>
          </div>
        </section>

        <section className="home-action-grid" aria-label="Primary study paths">
          {studyActions.map((action) => {
            const Icon = action.icon;
            return (
              <a key={action.href} href={action.href} className="home-action-card">
                <span className="home-action-icon">
                  <Icon className="h-5 w-5" />
                </span>
                <strong>{action.title}</strong>
                <span>{action.description}</span>
                <em>
                  Open
                  <ArrowRight className="h-4 w-4" />
                </em>
              </a>
            );
          })}
        </section>

        <section className="home-chapter-study" aria-labelledby="home-chapter-title">
          <div className="home-section-split">
            <div>
              <p className="home-section-kicker">Fifty-Chapter Study</p>
              <h2 id="home-chapter-title">{"Choose a chapter and read Genesis verse by verse."}</h2>
            </div>
            <p id="content-status">
              The complete 50-chapter reader places Scripture on the left and verse-by-verse
              exposition, historical context, and selected word studies on the right.
            </p>
          </div>

          <div className="home-chapter-group-grid">
            {bookPlans.map((book) => (
              <article key={book.id} id={book.id} className="home-chapter-group">
                <BookOpen className="home-chapter-group-icon h-6 w-6" />
                <p>{book.eyebrow}</p>
                <h3>{book.title}</h3>
                <div className="home-chapter-mini-grid">
                  {Array.from({ length: book.chapterCount }, (_, index) => index + 1).map((chapterNumber) => (
                    <a key={chapterNumber} href={`/${book.slug}/${chapterNumber}/`} aria-label={`${book.title} chapter ${chapterNumber}`}>
                      <span>{book.title}</span>
                      <strong>Chapter {chapterNumber}</strong>
                    </a>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
