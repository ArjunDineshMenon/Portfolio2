import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { beats, sceneState, smooth } from "./timeline";
import { certifications, links, projects, roadmap, skills } from "./content";
import { INFO_SHOTS } from "./director";
import "./cinematic.css";

gsap.registerPlugin(ScrollTrigger);
const Scene = lazy(() => import("./MovieScene"));
const asset = (name: string) =>
  `${import.meta.env.BASE_URL}assets/images/${name}.webp`;

function Arrow({ down = false }: { down?: boolean }) {
  return (
    <svg
      className={down ? "arrow down" : "arrow"}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path d="M5 19 19 5M5 5h14v14" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function Mark() {
  return (
    <svg
      width="34"
      height="38"
      viewBox="0 0 40 44"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m5 35 15-26 15 26M12 24h16M20 9v26"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M4 41h32" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
function SkillIcon({ kind }: { kind: string }) {
  const paths: Record<string, ReactNode> = {
    cloud: (
      <path d="M7 23h18a6 6 0 0 0 0-12 9 9 0 0 0-17-1 6.5 6.5 0 0 0-1 13Z" />
    ),
    terminal: (
      <>
        <rect x="3" y="5" width="26" height="22" rx="3" />
        <path d="m9 12 4 4-4 4m8 0h6" />
      </>
    ),
    code: (
      <>
        <path d="m11 9-7 7 7 7m10-14 7 7-7 7m-3-19-4 24" />
      </>
    ),
    language: (
      <>
        <path d="M4 8h17M12 4v4m-6 5c2 6 7 10 15 13M18 8c-1 9-6 14-14 18m17-6 4-11 5 17m-8-5h6" />
      </>
    ),
  };
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 34 34"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {paths[kind]}
    </svg>
  );
}
class SceneBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function StorySection({
  id,
  className = "",
  children,
}: {
  id: string;
  className?: string;
  children?: ReactNode;
}) {
  const beat = beats.find((b) => b.id === id)!;
  return (
    <section
      id={id}
      className={`story-section ${children ? "" : "empty-section"} ${className}`}
      style={{ "--span": beat.end - beat.start } as CSSProperties}
      aria-label={beat.label}
    >
      {children && (
        <div
          className="section-sticky"
          tabIndex={className.includes("content-section") ? 0 : undefined}
          data-start={beat.start}
          data-end={beat.end}
        >
          {children}
        </div>
      )}
    </section>
  );
}
function Eyebrow({
  number,
  children,
}: {
  number: string;
  children: ReactNode;
}) {
  return (
    <p className="eyebrow">
      <span className="section-number">{number}</span>
      <span className="eyebrow-line" />
      {children}
    </p>
  );
}

export default function App() {
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [cinematicOptIn, setCinematicOptIn] = useState(
    () => new URLSearchParams(location.search).get("mode") === "3d",
  );
  const [manualRead, setManualRead] = useState(
    () => new URLSearchParams(location.search).get("mode") === "read",
  );
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(0);
  const [ready, setReady] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [menu, setMenu] = useState(false);
  const [chapter, setChapter] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const reading = (reduced && !cinematicOptIn) || manualRead || failed;
  const progress = useRef(0);
  const main = useRef<HTMLElement>(null!);
  const world = useRef<HTMLDivElement>(null!);
  const meter = useRef<HTMLDivElement>(null!);
  const lastPercent = useRef(-1);
  const fallback = useCallback(() => {
    setFailed(true);
    setReady(true);
  }, []);
  const onSceneReady = useCallback(() => setSceneReady(true), []);

  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    let cancelled = false,
      count = 0;
    const timer = window.setTimeout(() => {
      if (!cancelled) setReady(true);
    }, 10000);
    const images = [
      "japanese-night-environment",
      "scifi-portal-environment",
      "arjun-face-cutout",
    ];
    for (const name of images) {
      const image = new Image();
      image.src = asset(name);
      image
        .decode()
        .catch(() => undefined)
        .then(() => {
          if (cancelled) return;
          setLoaded(++count);
          if (count === images.length) {
            clearTimeout(timer);
            setReady(true);
          }
        });
    }
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (reading) {
      progress.current = 0;
      return;
    }
    const update = (p: number) => {
      progress.current = p;
      const s = sceneState(p);
      world.current.style.setProperty("--scifi", String(s.scifi));
      world.current.style.setProperty(
        "--world-scale",
        String(1 + smooth(0, 0.89, p) * 0.11 - smooth(0.89, 1, p) * 0.11),
      );
      world.current.style.setProperty(
        "--world-x",
        `${Math.sin(p * Math.PI * 2) * 0.7}%`,
      );
      meter.current.style.transform = `scaleX(${p})`;
      const percent = Math.round(p * 100);
      if (percent !== lastPercent.current) {
        lastPercent.current = percent;
        setPercentage(percent);
        setChapter(
          Math.max(
            0,
            beats.findIndex((b) => p >= b.start && (p < b.end || b.end === 1)),
          ),
        );
      }
    };
    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: main.current,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: (self) => update(self.progress),
        onRefresh: (self) => update(self.progress),
      },
    });
    timeline.to({}, { duration: 1 });
    ScrollTrigger.refresh();
    return () => {
      timeline.scrollTrigger?.kill();
      timeline.kill();
    };
  }, [reading]);

  useEffect(() => {
    document.documentElement.classList.toggle("reading-mode", reading);
    const timer = setTimeout(() => ScrollTrigger.refresh(), 50);
    return () => clearTimeout(timer);
  }, [reading]);
  useEffect(() => {
    if (!menu) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(false);
        document.getElementById("menu-toggle")?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menu]);

  const jump = (id: string, focus = false) => {
    const section = document.getElementById(id);
    if (!section) return;
    setMenu(false);
    const shot = INFO_SHOTS.find(
      (s) => s.kind === (id === "projects" ? "project" : id),
    );
    const target = shot
      ? shot.start + (shot.end - shot.start) * 0.7
      : id === "contact"
        ? 0.999
        : id === "opening"
          ? 0
          : (beats.find((b) => b.id === id)?.start ?? 0.17) + 0.025;
    const y = reading
      ? section.offsetTop - 100
      : (document.documentElement.scrollHeight - innerHeight) * target;
    window.scrollTo({
      top: y,
      behavior: reading || reduced ? "instant" : "smooth",
    });
    if (focus && reading) {
      const target = section.querySelector<HTMLElement>("h1,h2") ?? section;
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    } else if (focus) {
      const until = performance.now() + 30000;
      const focusSurface = () => {
        if (Math.abs(progress.current - target) < 0.002) {
          const el = document.querySelector<HTMLElement>(
            '.cinema-surface[aria-hidden="false"] .cinema-primary,.movie-contact section,.movie-intro h1',
          );
          if (el) {
            el.setAttribute("tabindex", "-1");
            el.focus({ preventScroll: true });
            if (document.activeElement === el) return;
          }
        }
        if (performance.now() < until) requestAnimationFrame(focusSurface);
      };
      requestAnimationFrame(focusSurface);
    }
    history.replaceState(null, "", `#${id}`);
  };
  const navigate = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    jump(id, true);
  };
  const toggleReading = () => {
    const current = reading
      ? "about"
      : ["about", "skills", "projects", "roadmap", "contact"].includes(
            beats[chapter].id,
          )
        ? beats[chapter].id
        : "intro";
    if (reading) {
      setCinematicOptIn(true);
      setManualRead(false);
    } else setManualRead(true);
    const url = new URL(location.href);
    url.searchParams.set("mode", reading ? "3d" : "read");
    url.hash = reading ? "opening" : current;
    history.replaceState(null, "", url);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (reading)
          window.scrollTo({
            top: 0,
            behavior: "instant",
          });
        else
          document
            .getElementById(current)
            ?.scrollIntoView({ behavior: "instant", block: "start" });
        ScrollTrigger.refresh();
      }),
    );
  };

  return (
    <div
      className={`app ${reading ? "is-reading" : "is-cinematic"} ${sceneReady ? "scene-ready" : ""}`}
    >
      <a
        className="skip-link"
        href="#about"
        onClick={(e) => navigate(e, "about")}
      >
        Skip to portfolio
      </a>
      <div
        className="world"
        ref={world}
        aria-hidden={reading ? true : undefined}
        role={reading ? undefined : "main"}
        aria-label={reading ? undefined : "Arjun’s portfolio journey"}
      >
        {!reading && (
          <h1 className="sr-only">
            Arjun Dinesh Menon — Aspiring Cloud &amp; DevOps Engineer
          </h1>
        )}
        <div
          className="backdrop courtyard"
          style={{
            backgroundImage: `url(${asset("japanese-night-environment")})`,
          }}
        />
        <div
          className="backdrop scifi"
          style={{
            backgroundImage: `url(${asset("scifi-portal-environment")})`,
          }}
        />
        <div className="world-shade" />
        {!reading && ready && (
          <div className="scene">
            <SceneBoundary onError={fallback}>
              <Suspense fallback={null}>
                <Scene
                  progress={progress}
                  onError={fallback}
                  onReady={onSceneReady}
                />
              </Suspense>
            </SceneBoundary>
          </div>
        )}
        <div className="world-grain" />
      </div>

      <header className="site-header">
        <a
          href="#opening"
          className="brand"
          aria-label="Arjun Dinesh Menon, back to beginning"
          onClick={(e) => navigate(e, reading ? "intro" : "opening")}
        >
          <Mark />
          <span>
            ARJUN<span>DINESH MENON</span>
          </span>
        </a>
        <span className="header-edition">
          PORTFOLIO <span>© 2026</span>
        </span>
        <button
          id="menu-toggle"
          className="menu-toggle"
          aria-expanded={menu}
          aria-controls="primary-nav"
          onClick={() => setMenu(!menu)}
        >
          {menu ? "Close" : "Menu"}
          <span>{menu ? "−" : "+"}</span>
        </button>
        <nav
          id="primary-nav"
          className={menu ? "nav-open" : ""}
          aria-label="Main navigation"
        >
          {[
            ["about", "About"],
            ["skills", "Skills"],
            ["projects", "Work"],
            ["roadmap", "Path"],
          ].map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={(e) => navigate(e, id)}
              aria-current={
                beats[chapter].id === id && !reading ? "location" : undefined
              }
            >
              {label}
            </a>
          ))}
          <a
            className="nav-contact"
            href="#contact"
            onClick={(e) => navigate(e, "contact")}
          >
            Let’s connect <Arrow />
          </a>
        </nav>
      </header>

      {!ready && !reading && (
        <div className="loader" role="status">
          <span className="loader-orbit" />
          <p>SETTING THE SCENE</p>
          <div className="loader-track">
            <span style={{ width: `${(loaded / 3) * 100}%` }} />
          </div>
          <span>{loaded} / 3 ASSETS PREPARED</span>
          <button className="text-button" onClick={() => setManualRead(true)}>
            Read the portfolio <Arrow />
          </button>
        </div>
      )}

      <main
        aria-hidden={!reading}
        inert={!reading}
        ref={main}
        id="journey"
        onFocusCapture={(event) => {
          if (reading) return;
          const section = (event.target as HTMLElement).closest<HTMLElement>(
            ".story-section",
          );
          if (
            section &&
            section.id !== beats[chapter].id &&
            (event.target as HTMLElement).matches("a,button,summary")
          )
            jump(section.id);
        }}
      >
        {reading && (
          <h1 className="sr-only">
            Arjun Dinesh Menon — Aspiring Cloud &amp; DevOps Engineer
          </h1>
        )}
        <StorySection id="opening" className="opening">
          <div className="opening-coordinate">
            <span className="status-dot" />
            COIMBATORE, INDIA <span>→</span> JAPAN, SOMEDAY
          </div>
          <div className="opening-title">
            <p className="eyebrow">A PORTFOLIO IN MOTION</p>
            <h1>
              The journey
              <br />
              <em>begins.</em>
            </h1>
            <a
              href="#intro"
              className="journey-link"
              onClick={(e) => navigate(e, "intro")}
            >
              <span className="circle-arrow">
                <Arrow down />
              </span>
              <span>
                Scroll to discover<span>OR ENTER THE JOURNEY</span>
              </span>
            </a>
          </div>
          <div className="opening-note">
            <span>好奇心から、未来へ。</span>
            <p>From curiosity, toward the future.</p>
            <span className="fine-line" />
          </div>
        </StorySection>
        <StorySection id="formation" />
        <StorySection id="intro" className="intro">
          <div className="intro-copy">
            <Eyebrow number="01">HELLO, WORLD</Eyebrow>
            <h2>
              Hi, I’m
              <br />
              <em>Arjun.</em>
              <span className="accent-period">*</span>
            </h2>
            <p className="role">Aspiring Cloud &amp; DevOps Engineer</p>
            <div className="intro-meta">
              <span>CODE. CLOUD. CURIOSITY.</span>
              <span>INDIA → JAPAN</span>
            </div>
          </div>
          <img
            className="reading-portrait"
            src={asset("arjun-face-cutout")}
            alt="Arjun Dinesh Menon"
            width="280"
            height="351"
          />
        </StorySection>
        <StorySection id="arrival" className="arrival">
          <div className="narrow-copy">
            <Eyebrow number="↗">A SHARED PATH</Eyebrow>
            <p className="large-copy">
              First-year AI &amp; Data Science student at KGiSL Institute of
              Technology, building toward a{" "}
              <em>Cloud &amp; DevOps engineering career in Japan.</em>
            </p>
            <span className="small-label">ONE STEP. THEN THE NEXT.</span>
          </div>
        </StorySection>
        <StorySection id="slice" />
        <StorySection id="portal" className="transition">
          <p>
            Building beyond
            <br />
            <em>localhost.</em>
          </p>
          <span className="small-label">A NEW DIMENSION OF POSSIBILITY</span>
        </StorySection>

        <StorySection id="about" className="content-section">
          <div className="section-heading">
            <Eyebrow number="02">THE PERSON BEHIND THE PROJECTS</Eyebrow>
            <h2>
              Curiosity is
              <br />
              my <em>constant.</em>
            </h2>
          </div>
          <div className="about-layout">
            <div className="about-prose">
              <p>
                I’m pursuing a B.Tech in AI &amp; Data Science at KGiSL
                Institute of Technology, graduating in 2029. My focus is cloud
                infrastructure and DevOps, and every project I build is intended
                to move beyond localhost onto real infrastructure.
              </p>
              <p>
                Alongside AWS, Linux, containers, and automation, I study
                Japanese daily as I work toward a career and postgraduate study
                in Japan.
              </p>
              <div className="availability">
                <span className="status-dot" />
                OPEN TO INTERNSHIPS &amp; COLLABORATION
              </div>
            </div>
            <dl className="quick-facts">
              <div>
                <dt>THE FOUNDATION</dt>
                <dd>
                  B.Tech · AI &amp; Data Science
                  <span>
                    KGiSL Institute of Technology
                    <br />
                    Anna University · Class of 2029
                  </span>
                </dd>
              </div>
              <div>
                <dt>THE FOCUS</dt>
                <dd>
                  Cloud Infrastructure &amp; DevOps
                  <span>Core stack: AWS · Kubernetes · Terraform</span>
                </dd>
              </div>
              <div>
                <dt>THE DIRECTION</dt>
                <dd>
                  A future in Japan
                  <span>
                    Work in Japan · MEXT postgraduate study
                    <br />
                    Japanese goal: JLPT N3
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </StorySection>

        <StorySection id="skills" className="content-section">
          <div className="heading-row">
            <div>
              <Eyebrow number="03">THE TOOLKIT</Eyebrow>
              <h2>
                Built on learning.
                <br />
                <em>Always evolving.</em>
              </h2>
            </div>
            <p className="section-aside">
              What I use today.
              <br />
              What I’m working toward tomorrow.
            </p>
          </div>
          <div className="skills-grid">
            {skills.map((skill) => (
              <article className="skill-card" key={skill.n}>
                <div className="card-top">
                  <SkillIcon kind={skill.symbol} />
                  <span>{skill.n}</span>
                </div>
                <h3>{skill.title}</h3>
                <p className="skill-status">
                  <span className="status-dot" />
                  ACTIVELY USING
                </p>
                <ul className="tag-list">
                  {skill.active.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
                <p className="skill-status learning-label">
                  <span className="hollow-dot" />
                  CURRENTLY LEARNING
                </p>
                <ul className="tag-list learning">
                  {skill.learning.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </StorySection>

        <StorySection
          id="projects"
          className="content-section projects-section"
        >
          <div className="heading-row">
            <div>
              <Eyebrow number="04">SELECTED WORK</Eyebrow>
              <h2>
                Ideas, <em>deployed.</em>
              </h2>
            </div>
            <a
              href={links.github}
              target="_blank"
              rel="noreferrer"
              className="text-link"
            >
              Explore my GitHub <Arrow />
            </a>
          </div>
          <div className="projects-grid">
            {projects.map((project) => (
              <article className="project-card" key={project.n}>
                <div
                  className={`project-visual project-visual-${project.n}`}
                  aria-hidden="true"
                >
                  <span className="visual-index">{project.n}</span>
                  <div className="architecture-diagram">
                    {project.diagram.map((step, i) => (
                      <div className="diagram-node" key={step}>
                        <span className="node-icon">
                          {i === 0 ? "⌘" : i === 1 ? "◇" : "↗"}
                        </span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                  <span className="visual-caption">{project.type}</span>
                </div>
                <div className="project-content">
                  <span
                    className={`project-status ${project.n === "01" ? "live" : ""}`}
                  >
                    <span className="status-dot" />
                    {project.status}
                  </span>
                  <h3>{project.name}</h3>
                  <p>{project.description}</p>
                  <ul className="project-tech">
                    {project.tech.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
          <p className="project-footnote">
            Small steps on real infrastructure. Each project moves the path
            forward.
          </p>
        </StorySection>

        <StorySection id="roadmap" className="content-section roadmap-section">
          <div className="heading-row">
            <div>
              <Eyebrow number="05">THE WAY FORWARD</Eyebrow>
              <h2>
                A direction.
                <br />
                <em>Not a finish line.</em>
              </h2>
            </div>
            <p className="section-aside">
              India → Japan
              <br />A roadmap of intentions, one year at a time.
            </p>
          </div>
          <ol className="roadmap-grid">
            {roadmap.map((item) => (
              <li key={item.year}>
                <div className="year-row">
                  <span>{item.year}</span>
                  <span className="roadmap-status">{item.status}</span>
                </div>
                <span className="milestone-dot" />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ol>
          <div className="education-band">
            <span className="small-label">
              THE FOUNDATION
              <br />
              <span>2025 — 2029 · EXPECTED</span>
            </span>
            <div>
              <h3>B.Tech, Artificial Intelligence &amp; Data Science</h3>
              <p>
                KGiSL Institute of Technology · Anna University
                <br />
                School of Innovation · Cloud &amp; DevOps
              </p>
            </div>
            <div className="sgpa">
              <span>
                8.17<small>SEM 1 SGPA</small>
              </span>
              <span>
                8.52<small>SEM 2 SGPA</small>
              </span>
            </div>
          </div>
          <details className="credentials">
            <summary>
              Education &amp; certification targets <span>+</span>
            </summary>
            <div className="credential-content">
              <div>
                <h3>Education</h3>
                <p>B.Tech · No standing arrears.</p>
                <p>
                  <strong>Senior Secondary · CBSE · 2025</strong>
                  <br />B V B Vidya Mandir, Eravimangalam, Thrissur
                  <br />
                  80.8% aggregate · Computer Science 95/100
                </p>
                <p>
                  <strong>Secondary · CBSE · 2023</strong>
                  <br />K M B Vidya Mandir, Mulangunnathukavu, Thrissur
                  <br />
                  88.4% aggregate
                </p>
              </div>
              <div>
                <h3>Certifications in progress &amp; planned</h3>
                <p className="credential-note">
                  Dates are targets from my roadmap; no certification listed
                  here is claimed as earned.
                </p>
                <ul>
                  {certifications.map(([name, date, status]) => (
                    <li key={name}>
                      <span>
                        {name}
                        <small>Target: {date}</small>
                      </span>
                      <span className="credential-status">{status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </details>
        </StorySection>

        <StorySection id="return" className="transition">
          <p>
            The path
            <br />
            <em>continues.</em>
          </p>
          <span className="small-label">
            BACK TO WHERE IT BEGAN. LOOKING FORWARD.
          </span>
        </StorySection>
        <StorySection id="bow" className="bow">
          <p>
            Thank you
            <br />
            <em>for visiting.</em>
          </p>
          <span lang="ja">ありがとうございます。</span>
        </StorySection>
        <StorySection id="contact" className="contact">
          <Eyebrow number="06">THE NEXT CHAPTER</Eyebrow>
          <h2>
            Let’s build
            <br />
            <em>what’s next.</em>
            <span className="accent-period">↗</span>
          </h2>
          <p className="contact-copy">
            Open to internship opportunities, cloud project collaboration, and
            connecting with engineers on a similar path.
          </p>
          <a className="email-link" href={links.email}>
            arjundineshmenon1@gmail.com <Arrow />
          </a>
          <div className="contact-links">
            <a href={links.github} target="_blank" rel="noreferrer">
              GitHub <Arrow />
            </a>
            <a href={links.linkedin} target="_blank" rel="noreferrer">
              LinkedIn <Arrow />
            </a>
            <a href={links.resume} download className="resume-link">
              Download Resume <Arrow down />
            </a>
          </div>
          <footer>
            <span>© 2026 ARJUN DINESH MENON</span>
            <span>BUILT WITH CURIOSITY. AIMED AT THE CLOUD.</span>
            <a
              href="#opening"
              onClick={(e) => navigate(e, reading ? "intro" : "opening")}
            >
              Back to beginning ↑
            </a>
          </footer>
        </StorySection>
      </main>

      <aside className="journey-controls" aria-label="Experience controls">
        <div className="chapter-display">
          <span className="chapter-number">
            {reading ? "∞" : String(chapter + 1).padStart(2, "0")}
          </span>
          <span>
            {reading ? "AT YOUR OWN PACE" : beats[chapter].label.toUpperCase()}
          </span>
          <span className="chapter-total">
            {reading ? "READING VIEW" : "/ 13"}
          </span>
        </div>
        <div className="journey-progress" aria-hidden="true">
          <div ref={meter} />
        </div>
        <span className="percent" aria-hidden="true">
          {reading ? "—" : `${String(percentage).padStart(2, "0")}%`}
        </span>
        <button
          className="mode-button"
          onClick={toggleReading}
          aria-pressed={reading}
          disabled={failed}
          aria-describedby={
            reduced && reading && !failed ? "motion-notice" : undefined
          }
        >
          <span className={reading ? "mode-indicator off" : "mode-indicator"} />
          {failed
            ? "Reading view"
            : reading
              ? "Play 3D experience"
              : "Read portfolio"}
        </button>
        {reduced && reading && !failed && (
          <p id="motion-notice" className="fallback-notice">
            Your reduced-motion preference opened reading view. Choose “Play 3D
            experience” to watch the animated journey.
          </p>
        )}
      </aside>
      {failed && (
        <p role="status" className="fallback-notice">
          3D is unavailable on this device. Enjoy the complete portfolio in
          reading view.
        </p>
      )}
    </div>
  );
}
