import { useRef, useState, type MutableRefObject } from "react";
import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { certifications, links, projects, roadmap, skills } from "./content";
import { direct, type InfoShot } from "./director";
import { smooth, windowAt } from "./timeline";

function ShotCopy({ shot }: { shot: InfoShot }) {
  if (shot.kind === "about")
    return shot.item === 0 ? (
      <>
        <h2>
          Curiosity is
          <br />
          my <em>constant.</em>
        </h2>
        <p>
          I’m pursuing a B.Tech in AI &amp; Data Science at KGiSL Institute of
          Technology, graduating in 2029. My focus is cloud infrastructure and
          DevOps, and every project I build is intended to move beyond localhost
          onto real infrastructure.
        </p>
        <div className="cinema-facts">
          <span>
            AI &amp; Data Science<small>B.Tech · Class of 2029</small>
          </span>
          <span>
            Coimbatore, India<small>KGiSL · Anna University</small>
          </span>
        </div>
      </>
    ) : (
      <>
        <h2>
          Building toward
          <br />
          <em>Japan.</em>
        </h2>
        <p>
          Alongside AWS, Linux, containers, and automation, I study Japanese
          daily as I work toward a career and postgraduate study in Japan.
        </p>
        <div className="cinema-facts">
          <span>
            Cloud Infrastructure &amp; DevOps
            <small>Core stack: AWS · Kubernetes · Terraform</small>
          </span>
          <span>
            A future in Japan
            <small>
              Work in Japan · Target MEXT postgraduate study · JLPT N3 goal
            </small>
          </span>
        </div>
      </>
    );
  if (shot.kind === "skills") {
    const s = skills[shot.item];
    return (
      <>
        <span className="cinema-symbol" aria-hidden="true">
          {["☁", "⌘", "〈 / 〉", "あ"][shot.item]}
        </span>
        <h2>{s.title}</h2>
        <p className="cinema-subtitle">Built on learning. Always evolving.</p>
        <div className="cinema-stack">
          <h3>
            <i />
            Actively using
          </h3>
          <ul>
            {s.active.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <h3 className="learning">
            <i />
            Currently learning
          </h3>
          <ul className="learning">
            {s.learning.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </>
    );
  }
  if (shot.kind === "project") {
    const project = projects[shot.item];
    return (
      <>
        <div className="cinema-architecture" aria-hidden="true">
          {project.diagram.map((step, i) => (
            <span key={step}>
              <b>{["⌘", "◇", "↗"][i]}</b>
              {step}
            </span>
          ))}
        </div>
        <span className="cinema-status">{project.status}</span>
        <h2>{project.name}</h2>
        <p>{project.description}</p>
        <ul className="cinema-tags">
          {project.tech.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <a
          className="cinema-link"
          href={links.github}
          target="_blank"
          rel="noreferrer"
        >
          Explore my GitHub <span>↗</span>
        </a>
      </>
    );
  }
  if (shot.kind === "roadmap")
    return (
      <>
        <h2>
          A direction.
          <br />
          <em>Not a finish line.</em>
        </h2>
        <div className="cinema-milestones">
          {roadmap.slice(shot.item, shot.item + 2).map((m) => (
            <article key={m.year}>
              <div>
                <b>{m.year}</b>
                <span>{m.status}</span>
              </div>
              <h3>{m.title}</h3>
              <p>{m.text}</p>
            </article>
          ))}
        </div>
      </>
    );
  if (shot.kind === "education")
    return (
      <>
        <h2>
          The <em>foundation.</em>
        </h2>
        <div className="cinema-education">
          <article>
            <span>2025 — 2029 · EXPECTED</span>
            <h3>B.Tech · AI &amp; Data Science</h3>
            <p>
              KGiSL Institute of Technology · Anna University
              <br />
              School of Innovation · Cloud &amp; DevOps
              <br />
              No standing arrears.
            </p>
            <div className="cinema-grades">
              <b>
                8.17<small>Semester 1 SGPA</small>
              </b>
              <b>
                8.52<small>Semester 2 SGPA</small>
              </b>
            </div>
          </article>
          <article>
            <h3>Senior Secondary · CBSE · 2025</h3>
            <p>
              B V B Vidya Mandir, Eravimangalam, Thrissur
              <br />
              80.8% aggregate · Computer Science 95/100
            </p>
          </article>
          <article>
            <h3>Secondary · CBSE · 2023</h3>
            <p>
              K M B Vidya Mandir, Mulangunnathukavu, Thrissur
              <br />
              88.4% aggregate
            </p>
          </article>
        </div>
      </>
    );
  return (
    <>
      <h2>
        Always <em>learning.</em>
      </h2>
      <p className="cinema-subtitle">
        Certification targets · None claimed as earned.
      </p>
      <ul className="cinema-certifications">
        {certifications.map(([name, date, status]) => (
          <li key={name}>
            <span>
              {name}
              <small>Target: {date}</small>
            </span>
            <b>{status}</b>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Real HTML attached to a moving world-space surface. Scroll never moves a page of copy. */
export function InformationSurface({
  progress,
}: {
  progress: MutableRefObject<number>;
}) {
  const group = useRef<THREE.Group>(null!);
  const wrapper = useRef<HTMLDivElement>(null!);
  const [shot, setShot] = useState<InfoShot | null>(null);
  const current = useRef("");
  const projected = useRef(new THREE.Vector3());
  const { size } = useThree();
  useFrame(() => {
    const d = direct(progress.current, size.width < 760);
    group.current.position.set(...d.anchor);
    if ((d.shot?.id ?? "") !== current.current) {
      current.current = d.shot?.id ?? "";
      setShot(d.shot);
    }
    if (wrapper.current) {
      const reveal = d.reveal,
        cut = d.dissolve;
      wrapper.current.style.opacity = String(
        shot?.id === d.shot?.id ? reveal * (1 - cut) : 0,
      );
      wrapper.current.style.setProperty("--unseal", String(1 - reveal));
      wrapper.current.style.setProperty("--cut", String(cut));
      wrapper.current.style.setProperty("--impact", String(d.impact));
      wrapper.current.style.pointerEvents =
        reveal > 0.5 && cut < 0.5 ? "auto" : "none";
      wrapper.current.inert = reveal < 0.5 || cut > 0.5;
      wrapper.current.setAttribute(
        "aria-hidden",
        String(reveal < 0.5 || cut > 0.5),
      );
    }
  });
  return (
    <group ref={group}>
      <Html
        center
        zIndexRange={[12, 3]}
        style={{ pointerEvents: "none" }}
        calculatePosition={(object, camera, viewport) => {
          const point = projected.current
            .setFromMatrixPosition(object.matrixWorld)
            .project(camera);
          const width = wrapper.current?.offsetWidth ?? 0,
            height = wrapper.current?.offsetHeight ?? 0;
          return [
            THREE.MathUtils.clamp(
              ((point.x + 1) * viewport.width) / 2,
              width / 2 + 20,
              viewport.width - width / 2 - 20,
            ),
            THREE.MathUtils.clamp(
              ((1 - point.y) * viewport.height) / 2,
              height / 2 + 96,
              viewport.height - height / 2 - 68,
            ),
          ];
        }}
      >
        <div
          ref={wrapper}
          className="cinema-surface"
          data-shot={shot?.id ?? ""}
        >
          {shot && (
            <>
              <section
                className={`cinema-sheet cinema-primary cinema-${shot.kind}`}
                aria-label={shot.label}
                tabIndex={0}
              >
                <div className="cinema-sheet-header">
                  <span>ARJUN / ARCHIVE</span>
                  <span>{String(shot.item + 1).padStart(2, "0")}</span>
                </div>
                <div className="cinema-overline">{shot.label}</div>
                <ShotCopy shot={shot} />
                <div className="cinema-sheet-footer">
                  <span>SCROLL TO CONTINUE</span>
                  <span>↓</span>
                </div>
              </section>
              {["upper", "lower"].map((half) => (
                <div
                  key={half}
                  className={`cinema-fragment cinema-fragment-${half}`}
                  aria-hidden="true"
                  inert
                >
                  <div className={`cinema-sheet cinema-${shot.kind}`}>
                    <div className="cinema-sheet-header">
                      <span>ARJUN / ARCHIVE</span>
                      <span>{String(shot.item + 1).padStart(2, "0")}</span>
                    </div>
                    <div className="cinema-overline">{shot.label}</div>
                    <ShotCopy shot={shot} />
                    <div className="cinema-sheet-footer">
                      <span>SCROLL TO CONTINUE</span>
                      <span>↓</span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </Html>
    </group>
  );
}

export function StoryTitles({
  progress,
}: {
  progress: MutableRefObject<number>;
}) {
  const anchor = useRef<THREE.Group>(null!);
  const { camera, size } = useThree();
  const forward = useRef(new THREE.Vector3());
  const el = useRef<HTMLDivElement>(null!);
  const [beat, setBeat] = useState("opening");
  const prev = useRef("opening");
  useFrame(() => {
    anchor.current.position
      .copy(camera.position)
      .add(camera.getWorldDirection(forward.current));
    const p = progress.current;
    const next =
      p < 0.075
        ? "opening"
        : p < 0.17
          ? ""
          : p < 0.23
            ? "intro"
            : p < 0.32
              ? "arrival"
              : p < 0.405
                ? ""
                : p < 0.463
                  ? "portal"
                  : p < 0.898
                    ? ""
                    : p < 0.947
                      ? "return"
                      : p < 0.982
                        ? "bow"
                        : "contact";
    if (next !== prev.current) {
      prev.current = next;
      setBeat(next);
    }
    const ranges: Record<string, number[]> = {
      opening: [0, 0.075],
      intro: [0.17, 0.23],
      arrival: [0.23, 0.32],
      portal: [0.405, 0.463],
      return: [0.898, 0.947],
      bow: [0.95, 0.982],
      contact: [0.982, 1.01],
    };
    const range = ranges[next];
    if (el.current) {
      const alpha = range
        ? next === "opening"
          ? 1 - smooth(0.04, 0.075, p)
          : next === "contact"
            ? smooth(0.982, 0.993, p)
            : windowAt(p, range[0], range[1], 0.007)
        : 0;
      el.current.style.opacity = String(alpha);
      el.current.style.pointerEvents = alpha > 0.5 ? "auto" : "none";
      el.current.inert = alpha < 0.5;
    }
  });
  return (
    <group ref={anchor}>
      <Html
        fullscreen
        calculatePosition={() => [size.width / 2, size.height / 2]}
        zIndexRange={[13, 13]}
        style={{ pointerEvents: "none" }}
      >
        <div ref={el} className={`movie-title movie-${beat}`}>
          {beat === "opening" && (
            <>
              <p className="movie-kicker">A JOURNEY BEYOND LOCALHOST</p>
              <span className="movie-begin">
                Scroll to begin <b>↓</b>
              </span>
              <span className="movie-japanese" lang="ja">
                一歩ずつ。
              </span>
            </>
          )}
          {beat === "intro" && (
            <>
              <p className="movie-kicker">ARJUN DINESH MENON</p>
              <h1>
                Hi, I’m
                <br /> <em>Arjun.</em>
              </h1>
              <p className="movie-role">Aspiring Cloud &amp; DevOps Engineer</p>
            </>
          )}
          {beat === "arrival" && (
            <>
              <p className="movie-kicker">ONE STEP. THEN THE NEXT.</p>
              <p className="movie-bio">
                First-year AI &amp; Data Science student at KGiSL Institute of
                Technology, building toward a{" "}
                <em>Cloud &amp; DevOps engineering career in Japan.</em>
              </p>
            </>
          )}
          {beat === "portal" && (
            <p className="movie-caption">
              Building beyond <em>localhost.</em>
            </p>
          )}
          {beat === "return" && (
            <p className="movie-caption">
              The path <em>continues.</em>
            </p>
          )}
          {beat === "bow" && (
            <>
              <p className="movie-thanks">
                Thank you
                <br />
                <em>for visiting.</em>
              </p>
              <span lang="ja">ありがとうございます。</span>
            </>
          )}
          {beat === "contact" && (
            <section aria-label="Contact Arjun">
              <p className="movie-kicker">THE NEXT CHAPTER</p>
              <h2>
                Let’s build
                <br />
                <em>what’s next.</em>
              </h2>
              <p className="movie-contact-copy">
                Open to internship opportunities, cloud project collaboration,
                and connecting with engineers on a similar path.
              </p>
              <a className="movie-email" href={links.email}>
                arjundineshmenon1@gmail.com <span>↗</span>
              </a>
              <div className="movie-contact-links">
                <a href={links.github} target="_blank" rel="noreferrer">
                  GitHub ↗
                </a>
                <a href={links.linkedin} target="_blank" rel="noreferrer">
                  LinkedIn ↗
                </a>
                <a href={links.resume} download>
                  Download Resume ↓
                </a>
              </div>
              <p className="movie-copyright">© 2026 ARJUN DINESH MENON</p>
            </section>
          )}
        </div>
      </Html>
    </group>
  );
}
