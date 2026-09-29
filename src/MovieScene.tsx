import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useProgress } from "@react-three/drei";
import * as THREE from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { direct } from "./director";
import { createMovieSampler } from "./movieAnimation";
import { MoviePortrait } from "./MoviePortrait";
import { MovieWorld, WindAndAtmosphere } from "./MovieWorld";
import { Portals, HologramSurfaces, PortalFlash } from "./MovieEffects";
import { InformationSurface, StoryTitles } from "./CinematicCards";
import { LivingFuture, SamuraiInteraction } from "./SceneLife";

type Props = {
  progress: MutableRefObject<number>;
  onError: () => void;
  onReady: () => void;
};
class AssetBoundary extends Component<
  { children: ReactNode; onError: () => void },
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
function CameraAndHealth({
  progress,
  onError,
  onSlow,
}: {
  progress: MutableRefObject<number>;
  onError: () => void;
  onSlow: () => void;
}) {
  const { camera, gl, size } = useThree();
  const frames = useRef({ n: 0, t: 0, warmup: 0, fastest: 1 / 60 });
  const lastCamera = useRef({ progress: -1, width: 0, height: 0 });
  useEffect(() => {
    const lost = (e: Event) => {
      e.preventDefault();
      onError();
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    gl.domElement.setAttribute("aria-hidden", "true");
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, onError]);
  useFrame((_, delta) => {
    const d = direct(progress.current, size.width < 760);
    const changed =
      lastCamera.current.progress !== progress.current ||
      lastCamera.current.width !== size.width ||
      lastCamera.current.height !== size.height;
    if (changed) {
      camera.position.set(...d.camera);
      camera.lookAt(...d.look);
      camera.updateMatrixWorld();
      lastCamera.current = {
        progress: progress.current,
        width: size.width,
        height: size.height,
      };
    }
    if (camera instanceof THREE.PerspectiveCamera) {
      const fov = size.width < 760 ? 51 : 42;
      if (camera.fov !== fov) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
    }
    if (changed) {
      gl.domElement.dataset.scene = d.scifi > 0.5 ? "scifi" : "courtyard";
      const app = gl.domElement.closest<HTMLElement>(".app");
      if (app) app.dataset.world = d.scifi > 0.5 ? "scifi" : "courtyard";
      gl.domElement.dataset.shot = d.shot?.id ?? "";
    }
    const h = frames.current;
    h.warmup += delta;
    if (h.warmup > 5 && delta < 0.5) {
      if (delta > 1 / 300) h.fastest = Math.min(h.fastest, delta);
      h.n++;
      h.t += delta;
      if (h.t > 3) {
        const fps = h.n / h.t;
        const target = Math.min(240, 1 / h.fastest);
        gl.domElement.dataset.fps = fps.toFixed(0);
        gl.domElement.dataset.drawCalls = String(gl.info.render.calls);
        gl.domElement.dataset.triangles = String(gl.info.render.triangles);
        if (fps < target * 0.78) onSlow();
        h.n = 0;
        h.t = 0;
      }
    }
  }, -3);
  return null;
}

function Actor({
  progress,
  onLoaded,
  onError,
}: {
  progress: MutableRefObject<number>;
  onLoaded: () => void;
  onError: () => void;
}) {
  const { scene, animations } = useGLTF(
    `${import.meta.env.BASE_URL}assets/models/samurai-sakura.glb`,
    `${import.meta.env.BASE_URL}draco/`,
  );
  const group = useRef<THREE.Group>(null!),
    trail = useRef<THREE.Mesh>(null!);
  const { size, gl } = useThree();
  const { model, scale, offset, materials, blade } = useMemo(() => {
    const model = clone(scene),
      materials: THREE.MeshStandardMaterial[] = [];
    model.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.frustumCulled = false;
        const source = Array.isArray(o.material) ? o.material : [o.material];
        const copies = source.map((m) => {
          const c = m.clone() as THREE.MeshStandardMaterial;
          c.alphaHash = !c.transparent;
          materials.push(c);
          return c;
        });
        o.material = Array.isArray(o.material) ? copies : copies[0];
      }
    });
    const box = new THREE.Box3().setFromObject(model);
    return {
      model,
      scale: 3.05 / (box.max.y - box.min.y),
      offset: new THREE.Vector3(0, -box.min.y, 0),
      materials,
      blade: model.getObjectByName("blade_socket")!,
    };
  }, [scene]);
  const sampler = useMemo(
    () => createMovieSampler(model, animations),
    [model, animations],
  );
  const ribbon = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(8 * 6 * 3), 3),
    );
    const uv = [];
    for (let i = 0; i < 8; i++)
      uv.push(
        i / 8,
        0,
        i / 8,
        1,
        (i + 1) / 8,
        1,
        i / 8,
        0,
        (i + 1) / 8,
        1,
        (i + 1) / 8,
        0,
      );
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    return geometry;
  }, []);
  const trailUniforms = useMemo(() => ({ uStrength: { value: 0 } }), []);
  const vectors = useMemo(
    () =>
      Array.from({ length: 9 }, () => [
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]),
    [],
  );
  const lastTrail = useRef(-1);
  const lastTrailWidth = useRef(0);
  useEffect(() => {
    sampler.activate();
    if (sampler.ready && blade) onLoaded();
    else onError();
    return () => {
      sampler.dispose();
      materials.forEach((m) => m.dispose());
      ribbon.dispose();
    };
  }, [sampler, blade, onLoaded, onError, materials, ribbon]);
  useFrame(({ clock }) => {
    const p = progress.current,
      d = direct(p, size.width < 760),
      mobile = size.width < 760;
    group.current.position.set(...d.actor);
    group.current.rotation.y = d.yaw;
    group.current.visible = p < 1;
    group.current.scale.setScalar(d.actorScale);
    materials.forEach((m) => (m.opacity = d.actorOpacity));
    const ambient = clock.elapsedTime;
    const active = sampler.sample(p, ambient);
    model.updateMatrixWorld(true);
    group.current.updateMatrixWorld(true);
    const striking =
      active.name.includes("Slash") || active.name === "Hologram_Slice";
    const intensity = striking
      ? Math.pow(Math.sin(active.time * Math.PI), 3) * d.actorOpacity
      : 0;
    trail.current.visible = intensity > 0.03;
    if (
      intensity > 0.03 &&
      blade &&
      (p !== lastTrail.current || size.width !== lastTrailWidth.current)
    ) {
      lastTrail.current = p;
      lastTrailWidth.current = size.width;
      for (let i = 0; i < 9; i++) {
        const trailP = Math.max(0, p - i * (d.dash > 0 ? 0.0012 : 0.00012));
        sampler.sample(trailP, ambient);
        const past = direct(trailP, mobile);
        group.current.position.set(...past.actor);
        group.current.rotation.y = past.yaw;
        group.current.updateMatrixWorld(true);
        vectors[i][0].set(0, 0.05, 0).applyMatrix4(blade.matrixWorld);
        vectors[i][1].set(0, 0.72, 0).applyMatrix4(blade.matrixWorld);
      }
      const attr = ribbon.getAttribute("position") as THREE.BufferAttribute;
      let n = 0;
      for (let i = 0; i < 8; i++)
        for (const v of [
          vectors[i][0],
          vectors[i][1],
          vectors[i + 1][1],
          vectors[i][0],
          vectors[i + 1][1],
          vectors[i + 1][0],
        ]) {
          attr.setXYZ(n++, v.x, v.y, v.z);
        }
      attr.needsUpdate = true;
      (
        trail.current.material as THREE.ShaderMaterial
      ).uniforms.uStrength.value = intensity;
      group.current.position.set(...d.actor);
      group.current.rotation.y = d.yaw;
      sampler.sample(p, ambient);
      group.current.updateMatrixWorld(true);
    }
    gl.domElement.dataset.animation = sampler.ready ? "rigged" : "incomplete";
    gl.domElement.dataset.clip = active.name;
    gl.domElement.dataset.actor = d.actor.map((n) => n.toFixed(3)).join(",");
    gl.domElement.dataset.clipTime = active.time.toFixed(3);
  }, -1);
  return (
    <>
      <group ref={group}>
        <mesh
          position={[0, 0.006, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[1, 0.63, 1]}
        >
          <circleGeometry args={[0.56, 40]} />
          <meshBasicMaterial
            color="#00030a"
            transparent
            opacity={0.48}
            depthWrite={false}
          />
        </mesh>
        <group scale={scale}>
          <primitive object={model} position={offset} />
        </group>
      </group>
      <SamuraiInteraction progress={progress} model={model} />
      <mesh ref={trail} geometry={ribbon} frustumCulled={false}>
        <shaderMaterial
          uniforms={trailUniforms}
          vertexShader={`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
          fragmentShader={`varying vec2 vUv;uniform float uStrength;void main(){float a=pow(1.-vUv.x,1.2)*pow(max(0.,sin(vUv.y*3.14159)),.5);gl_FragColor=vec4(.35,.9,1.,a*uStrength*.85);}`}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}

export default function MovieScene({ progress, onError, onReady }: Props) {
  const [low, setLow] = useState(
    () =>
      matchMedia("(max-width:760px)").matches ||
      (navigator.hardwareConcurrency || 8) <= 4,
  );
  const [hidden, setHidden] = useState(document.hidden);
  const [modelReady, setModelReady] = useState(false);
  const { progress: loaded } = useProgress();
  const readyModel = useCallback(() => setModelReady(true), []);
  const slow = useCallback(() => setLow(true), []);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return (
    <>
      {!modelReady && (
        <div className="character-loading" role="status">
          Preparing the journey · {Math.round(loaded)}%
        </div>
      )}
      <Canvas
        dpr={low ? 1 : [1, 1.25]}
        frameloop={hidden ? "never" : "always"}
        camera={{ position: [0, 2, 12], fov: 42, near: 0.08, far: 110 }}
        gl={{
          alpha: false,
          antialias: !low,
          powerPreference: "high-performance",
          stencil: false,
        }}
        onCreated={({ gl }) => gl.setClearColor("#e2edf3", 1)}
      >
        <fog attach="fog" args={["#071522", 16, 58]} />
        <ambientLight intensity={1.15} color="#e6edf2" />
        <directionalLight
          position={[4, 7, 5]}
          intensity={2.1}
          color="#fff8ef"
        />
        <directionalLight
          position={[-5, 4, -5]}
          intensity={1.3}
          color="#aecfe4"
        />
        <hemisphereLight args={["#d7ecff", "#65705b", 0.8]} />
        <CameraAndHealth progress={progress} onError={onError} onSlow={slow} />
        <AssetBoundary onError={onError}>
          <Suspense fallback={null}>
            <MovieWorld progress={progress} />
            <MoviePortrait progress={progress} low={low} onReady={onReady} />
          </Suspense>
          <Suspense fallback={null}>
            <Actor
              progress={progress}
              onLoaded={readyModel}
              onError={onError}
            />
          </Suspense>
        </AssetBoundary>
        <WindAndAtmosphere progress={progress} low={low} />
        <LivingFuture progress={progress} low={low} />
        <Portals progress={progress} />
        <HologramSurfaces progress={progress} />
        <PortalFlash progress={progress} />
        <InformationSurface progress={progress} />
        <StoryTitles progress={progress} />
      </Canvas>
    </>
  );
}
