import type { ExternalLink } from "@promptfolio/core";
import { formatDateRange, headerLinks, roleHeading } from "@/lib/format";
import { getProfile } from "@/lib/profile";

// Must be a literal for Next.js to read it; keep in step with PROFILE_REVALIDATE_SECONDS.
export const revalidate = 3600;

function LinkList({ links, className }: { links: ExternalLink[]; className: string }) {
  if (links.length === 0) return null;
  return (
    <ul className={className}>
      {links.map((link) => (
        <li key={link.url}>
          <a href={link.url} target="_blank" rel="noopener noreferrer">
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

export default async function Home() {
  const { identity, links, experience = [], projects = [] } = await getProfile();
  const role = [identity.headline, identity.location].filter(Boolean).join(" · ");

  return (
    <main>
      <header>
        <h1>{identity.name}</h1>
        <p className="muted">{role}</p>
        <p className="summary">{identity.summary}</p>
        <LinkList links={headerLinks(links, process.env.CHAT_URL)} className="links" />
      </header>

      {experience.length > 0 && (
        <section aria-labelledby="experience">
          <h2 id="experience">Experience</h2>
          <ul className="entries">
            {experience.map((item) => (
              <li key={item.id}>
                <div className="entry-head">
                  <h3>{roleHeading(item)}</h3>
                  <span className="muted small">{formatDateRange(item.start, item.end)}</span>
                </div>
                {item.summary && <p>{item.summary}</p>}
                {item.highlights && item.highlights.length > 0 && (
                  <ul className="highlights">
                    {item.highlights.map((highlight) => (
                      <li key={highlight}>{highlight}</li>
                    ))}
                  </ul>
                )}
                <LinkList links={item.links ?? []} className="entry-links" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {projects.length > 0 && (
        <section aria-labelledby="projects">
          <h2 id="projects">Projects</h2>
          <ul className="entries">
            {projects.map((project) => (
              <li key={project.id}>
                <h3>{project.name}</h3>
                <p>{project.description}</p>
                <LinkList links={project.links ?? []} className="entry-links" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="muted small">
        © {new Date().getFullYear()} {identity.name}
      </footer>
    </main>
  );
}
