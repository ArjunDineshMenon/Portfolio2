import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useTexture, useProgress } from "@react-three/drei";
import * as THREE from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { createSamuraiTimeline } from "./animation";
import { sceneState, smooth, windowAt } from "./timeline";

const base = import.meta.env.BASE_URL;
type SceneProps = {
  progress: MutableRefObject<number>;
  onError: () => void;
  onReady: () => void;
};
class ModelBoundary extends Component<
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

function ContextMonitor({ onError }: { onError: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault();
      onError();
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, onError]);
  return null;
}

function CameraRig({
  progress,
  onSlow,
}: {
  progress: MutableRefObject<number>;
  onSlow: () => void;
}) {
  const { camera } = useThree();
  const sample = useRef({ frames: 0, elapsed: 0, warmup: 0 });
  useFrame((_, delta) => {
    const p = progress.current;
    const state = sceneState(p);
    const drift = Math.sin(p * Math.PI * 2) * 0.32;
    camera.position.set(
      drift,
      0.45 + Math.sin(p * Math.PI) * 0.2,
      10 -
        smooth(0, 0.39, p) * 1.15 -
        state.scifi * 1.0 +
        smooth(0.89, 1, p) * 1.15,
    );
    camera.lookAt(drift * 0.2, 0.35, -1);
    const s = sample.current;
    s.warmup += delta;
    if (s.warmup > 4 && delta < 0.5) {
      s.frames++;
      s.elapsed += delta;
      if (s.elapsed > 3) {
        if (s.frames / s.elapsed < 35) onSlow();
        s.frames = 0;
        s.elapsed = 0;
      }
    }
  });
  return null;
}

const particleVertex = `
  attribute vec3 target;
  attribute vec3 tint;
  attribute float seed;
  uniform float uProgress;
  uniform float uFormation;
  uniform float uDissolve;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float portal = smoothstep(0.39,0.47,uProgress);
    float time = uProgress * 32.0 + portal * portal * 95.0;
    vec3 origin = position;
    origin.x += sin(time + seed * 19.0) * 0.6;
    origin.y += cos(time * 0.7 + seed * 23.0) * 0.55;
    float orbit = time * 0.22 + seed;
    origin.xz = mat2(cos(orbit),-sin(orbit),sin(orbit),cos(orbit)) * origin.xz;
    vec3 point = mix(origin, target, uFormation);
    vec3 burst = vec3(sin(seed*83.0)*9.0, cos(seed*97.0)*6.0, -8.0 - seed*34.0);
    point += burst * uDissolve;
    float spin = portal * portal * 38.0;
    point.xy = mat2(cos(spin),-sin(spin),sin(spin),cos(spin)) * point.xy;
    vec4 mvPosition = modelViewMatrix * vec4(point, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = clamp((1.5 + seed * 1.4) * uPixelRatio * (7.0 / -mvPosition.z), 0.5, 5.0);
    vColor = mix(vec3(0.33, 0.84, 0.88), tint + vec3(0.05, 0.24, 0.26), uFormation * 0.78);
    float portraitFade = 1.0 - 0.94 * smoothstep(0.17, 0.20, uProgress) * (1.0 - smoothstep(0.35, 0.385, uProgress));
    vAlpha = (0.20 + uFormation * 0.64) * portraitFade * (1.0 - smoothstep(0.43, 0.475, uProgress));
  }
`;
const particleFragment = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    gl_FragColor = vec4(vColor, (1.0-smoothstep(0.15,0.5,r)) * vAlpha);
  }
`;
const portraitVertex = `
  varying vec2 vUv;
  uniform float uSplit;
  uniform float uHalf;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.x += uHalf * uSplit * 1.5;
    p.y += uHalf * uSplit * 0.35;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const portraitFragment = `
  uniform sampler2D uTexture;
  uniform float uOpacity;
  uniform float uProgress;
  uniform float uHalf;
  varying vec2 vUv;
  void main() {
    if (uHalf > 0.0 && vUv.y < 0.5) discard;
    if (uHalf < 0.0 && vUv.y >= 0.5) discard;
    vec4 face = texture2D(uTexture, vUv);
    float scan = 0.92 + 0.08 * sin(vUv.y * 650.0 + uProgress * 70.0);
    vec3 tint = mix(face.rgb, face.rgb * vec3(0.48, 1.16, 1.35), 0.38);
    gl_FragColor = vec4(tint * scan, face.a * uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function Portrait({
  progress,
  count,
  onReady,
}: {
  progress: MutableRefObject<number>;
  count: number;
  onReady: () => void;
}) {
  const texture = useTexture(`${base}assets/images/arjun-face-cutout.webp`);
  const group = useRef<THREE.Group>(null!);
  const particles = useRef<THREE.ShaderMaterial>(null!);
  const faces = useRef<(THREE.ShaderMaterial | null)[]>([]);
  const halo = useRef<THREE.Mesh>(null!);
  const { gl, size } = useThree();
  const buffers = useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    const image = texture.image as HTMLImageElement;
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 320;
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const eligible: number[] = [];
    for (let i = 0; i < pixels.length; i += 4)
      if (pixels[i + 3] > 100) eligible.push(i / 4);
    const positions = new Float32Array(count * 3),
      targets = new Float32Array(count * 3),
      colors = new Float32Array(count * 3),
      seeds = new Float32Array(count);
    let seed = 71;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < count; i++) {
      const pixel = eligible[Math.floor(random() * eligible.length)];
      const x = pixel % canvas.width,
        y = Math.floor(pixel / canvas.width);
      positions.set(
        [(random() - 0.5) * 13, (random() - 0.5) * 8, (random() - 0.5) * 8],
        i * 3,
      );
      targets.set(
        [
          (x / canvas.width - 0.5) * 2.45,
          (0.5 - y / canvas.height) * 3.07,
          0.34 *
            Math.exp(
              -Math.pow((x / canvas.width - 0.5) * 3, 2) -
                Math.pow((y / canvas.height - 0.51) * 2.4, 2),
            ) +
            (random() - 0.5) * 0.08,
        ],
        i * 3,
      );
      colors.set(
        [
          pixels[pixel * 4] / 255,
          pixels[pixel * 4 + 1] / 255,
          pixels[pixel * 4 + 2] / 255,
        ],
        i * 3,
      );
      seeds[i] = random();
    }
    return { positions, targets, colors, seeds };
  }, [texture, count]);
  const uniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uFormation: { value: 0 },
      uDissolve: { value: 0 },
      uPixelRatio: { value: 1 },
    }),
    [],
  );
  const faceUniforms = useMemo(
    () =>
      [-1, 1].map((half) => ({
        uTexture: { value: texture },
        uOpacity: { value: 0 },
        uSplit: { value: 0 },
        uProgress: { value: 0 },
        uHalf: { value: half },
      })),
    [texture],
  );
  useEffect(onReady, [onReady]);
  useFrame(() => {
    const p = progress.current,
      s = sceneState(p);
    group.current.visible = p < 0.49;
    const mobile = size.width < 760;
    group.current.position.set(
      smooth(0.155, 0.195, p) *
        (mobile ? 0.25 : 2.15 - smooth(0.23, 0.32, p) * 0.8),
      mobile ? 1.05 : 0.65,
      0,
    );
    group.current.scale.setScalar(mobile ? 0.69 : 1);
    particles.current.uniforms.uProgress.value = p;
    particles.current.uniforms.uFormation.value = s.formation;
    particles.current.uniforms.uDissolve.value = s.dissolution;
    particles.current.uniforms.uPixelRatio.value = gl.getPixelRatio();
    faces.current.forEach((face) => {
      if (!face) return;
      face.uniforms.uOpacity.value = s.portrait;
      face.uniforms.uSplit.value = smooth(0.348, 0.378, p);
      face.uniforms.uProgress.value = p;
    });
    const material = halo.current.material as THREE.MeshBasicMaterial;
    material.opacity = windowAt(p, 0.14, 0.37, 0.03) * 0.27;
    halo.current.rotation.z = p * 2;
  });
  return (
    <group ref={group}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[buffers.positions, 3]}
          />
          <bufferAttribute
            attach="attributes-target"
            args={[buffers.targets, 3]}
          />
          <bufferAttribute
            attach="attributes-tint"
            args={[buffers.colors, 3]}
          />
          <bufferAttribute attach="attributes-seed" args={[buffers.seeds, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={particles}
          uniforms={uniforms}
          vertexShader={particleVertex}
          fragmentShader={particleFragment}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      {faceUniforms.map((uniforms, i) => (
        <mesh key={i} position={[0, 0, 0.15]}>
          <planeGeometry args={[2.45, 3.07]} />
          <shaderMaterial
            ref={(material) => {
              faces.current[i] = material;
            }}
            uniforms={uniforms}
            vertexShader={portraitVertex}
            fragmentShader={portraitFragment}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      <mesh ref={halo} position={[0, 0, -0.25]}>
        <ringGeometry args={[1.89, 1.895, 96]} />
        <meshBasicMaterial
          color="#a3e7e4"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function Samurai({
  progress,
  onLoaded,
  onError,
}: {
  progress: MutableRefObject<number>;
  onLoaded: () => void;
  onError: () => void;
}) {
  const { scene, animations } = useGLTF(
    `${base}assets/models/samurai-animated.glb`,
    `${base}draco/`,
  );
  const group = useRef<THREE.Group>(null!);
  const { size, gl } = useThree();
  const { model, scale, offset, materials } = useMemo(() => {
    const model = clone(scene);
    const materials: THREE.MeshStandardMaterial[] = [];
    model.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = false;
        obj.receiveShadow = false;
        const source = Array.isArray(obj.material)
          ? obj.material
          : [obj.material];
        const cloned = source.map((m) => {
          const copy = m.clone() as THREE.MeshStandardMaterial;
          // Keep opaque skin ahead of transparent hair in Three's render queues.
          // Alpha hashing fades opaque surfaces without breaking hair depth order.
          copy.alphaHash = !copy.transparent;
          materials.push(copy);
          return copy;
        });
        obj.material = Array.isArray(obj.material) ? cloned : cloned[0];
      }
    });
    const box = new THREE.Box3().setFromObject(model),
      dimensions = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    return {
      model,
      scale: 3.9 / dimensions.y,
      offset: new THREE.Vector3(-center.x, -box.min.y, -center.z),
      materials,
    };
  }, [scene]);
  const timeline = useMemo(
    () => createSamuraiTimeline(model, animations),
    [model, animations],
  );
  useEffect(() => {
    if (timeline.ready) onLoaded();
    else onError();
  }, [timeline, onLoaded, onError]);
  useEffect(
    () => () => {
      timeline.dispose();
      materials.forEach((m) => m.dispose());
    },
    [timeline, materials],
  );
  useFrame(() => {
    const p = progress.current,
      s = sceneState(p);
    group.current.visible = p > 0.23;
    const mobile = size.width < 760;
    const entry = smooth(0.23, 0.31, p);
    const inPanels = windowAt(p, 0.465, 0.895, 0.008);
    group.current.scale.setScalar(mobile ? 1 - inPanels * 0.4 : 1);
    group.current.position.set(
      (mobile ? 0.65 * (1 - inPanels) : 3.05 + inPanels * 0.6) +
        (1 - entry) * 0.8,
      -1.95 + (mobile ? inPanels * 2.65 : 0),
      -1.35,
    );
    group.current.rotation.y = -0.45;
    materials.forEach((m) => {
      m.opacity = s.samurai * (mobile ? 1 - smooth(0.98, 0.995, p) : 1);
    });
    group.current.userData.animationStatus = timeline.ready
      ? "rigged"
      : "placeholder-static";
    const cue = timeline.sample(p);
    group.current.userData.clipHook = cue;
    gl.domElement.dataset.animation = timeline.ready ? "rigged" : "incomplete";
    gl.domElement.dataset.clip = cue;
  });
  return (
    <group ref={group}>
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55, 48]} />
        <meshBasicMaterial
          color="#010609"
          transparent
          opacity={0.24}
          depthWrite={false}
        />
      </mesh>
      <group scale={scale}>
        <primitive object={model} position={offset} />
      </group>
    </group>
  );
}

function WorldGeometry({ progress }: { progress: MutableRefObject<number> }) {
  const portal = useRef<THREE.Group>(null!);
  const light = useRef<THREE.Mesh>(null!);
  const panels = useRef<THREE.Group>(null!);
  const motes = useRef<THREE.Points>(null!);
  const dust = useMemo(() => {
    const data = new Float32Array(650 * 3);
    for (let i = 0; i < 650; i++)
      data.set(
        [
          Math.sin(i * 73.81) * 12,
          Math.cos(i * 17.14) * 6,
          -2 - (i % 50) * 0.4,
        ],
        i * 3,
      );
    return data;
  }, []);
  useFrame(() => {
    const p = progress.current,
      s = sceneState(p);
    portal.current.visible = s.portal > 0.001;
    portal.current.scale.setScalar(0.75 + s.portal * 2.8);
    portal.current.rotation.z = p * 6;
    portal.current.children.forEach((child) => {
      ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity =
        s.portal * 0.7;
    });
    panels.current.visible = s.scifi > 0.05;
    panels.current.position.y = -0.5 + s.scifi * 0.5;
    panels.current.children.forEach((child, i) => {
      const appear = smooth(0.68 + i * 0.034, 0.7 + i * 0.034, p);
      ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity =
        appear * s.scifi * 0.26;
    });
    // Light accent synchronized with the actual bone-driven katana crossing.
    const sweep = smooth(0.348, 0.37, p);
    light.current.visible = p > 0.348 && p < 0.378;
    light.current.position.set(-3 + sweep * 8, 0.85, 0.6);
    light.current.scale.x = 0.4 + Math.sin(sweep * Math.PI) * 4;
    (light.current.material as THREE.MeshBasicMaterial).opacity =
      windowAt(p, 0.348, 0.378) * 0.8;
    motes.current.rotation.z = p * 0.35;
    motes.current.position.z = s.portal * 7;
  });
  return (
    <>
      <points ref={motes}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dust, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.022}
          color="#7eb4bc"
          transparent
          opacity={0.48}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
      <group ref={portal} position={[0, 0.6, -3]}>
        {[2.4, 2.54, 2.85].map((radius, i) => (
          <mesh key={radius} rotation={[0.12 * i, 0.1 * i, i]}>
            <torusGeometry args={[radius, i === 0 ? 0.018 : 0.005, 6, 96]} />
            <meshBasicMaterial
              color={i === 1 ? "#e5b88b" : "#83d8e1"}
              transparent
              opacity={0}
            />
          </mesh>
        ))}
      </group>
      <mesh ref={light} rotation={[0, 0, -0.12]}>
        <planeGeometry args={[1.9, 0.014]} />
        <meshBasicMaterial
          color="#ceffff"
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <group ref={panels} position={[0, 0, -5]}>
        {[-3.8, 0, 3.8].map((x, i) => (
          <mesh
            key={x}
            position={[x, 0, -i * 0.6]}
            rotation={[0, 0.22 - i * 0.2, 0]}
          >
            <boxGeometry args={[2.6, 3.8, 0.09]} />
            <meshStandardMaterial
              color="#32606b"
              emissive="#296578"
              emissiveIntensity={0.7}
              metalness={0.5}
              roughness={0.2}
              transparent
              opacity={0}
              wireframe
            />
          </mesh>
        ))}
      </group>
      {[-5.4, 5.4].map((x) => (
        <group key={x} position={[x, -2.3, -3]} scale={0.45}>
          <mesh>
            <boxGeometry args={[0.48, 0.2, 0.48]} />
            <meshStandardMaterial color="#222a2c" />
          </mesh>
          <mesh position={[0, 0.47, 0]}>
            <boxGeometry args={[0.12, 0.8, 0.12]} />
            <meshStandardMaterial color="#20282a" />
          </mesh>
          <mesh position={[0, 0.98, 0]}>
            <boxGeometry args={[0.3, 0.35, 0.3]} />
            <meshStandardMaterial
              color="#976733"
              emissive="#c3853a"
              emissiveIntensity={0.6}
            />
          </mesh>
          <mesh position={[0, 1.22, 0]}>
            <coneGeometry args={[0.35, 0.2, 4]} />
            <meshStandardMaterial color="#222a2c" />
          </mesh>
          <pointLight
            position={[0, 1, 0]}
            color="#efb171"
            intensity={3}
            distance={4}
          />
        </group>
      ))}
    </>
  );
}

export default function Scene({ progress, onError, onReady }: SceneProps) {
  const [hidden, setHidden] = useState(document.hidden);
  const [low, setLow] = useState(
    () =>
      matchMedia("(max-width: 760px)").matches ||
      (navigator.hardwareConcurrency || 8) <= 4,
  );
  const [streamModel, setStreamModel] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const { progress: assetProgress } = useProgress();
  const loadedModel = useMemo(() => () => setModelReady(true), []);
  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    const timer = window.setTimeout(() => setStreamModel(true), 1200);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  return (
    <>
      {streamModel && !modelReady && (
        <div className="character-loading" role="status">
          Preparing the samurai · {Math.round(assetProgress)}%
        </div>
      )}
      <Canvas
        dpr={low ? [1, 1.15] : [1, 1.65]}
        frameloop={hidden ? "never" : "always"}
        camera={{ position: [0, 0.45, 10], fov: 43, near: 0.1, far: 75 }}
        gl={{
          alpha: true,
          antialias: !low,
          powerPreference: "high-performance",
          stencil: false,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
        fallback={
          <span className="sr-only">
            3D is unavailable. Use the reading view to explore the portfolio.
          </span>
        }
      >
        <ContextMonitor onError={onError} />
        <fog attach="fog" args={["#0c1720", 14, 48]} />
        <ambientLight intensity={1.1} color="#b6c8db" />
        <directionalLight
          position={[3, 5, 5]}
          intensity={3.5}
          color="#e6ebeb"
        />
        <directionalLight
          position={[-4, 2, -2]}
          intensity={4}
          color="#4fbdde"
        />
        <CameraRig progress={progress} onSlow={() => setLow(true)} />
        <Suspense fallback={null}>
          <Portrait
            progress={progress}
            count={low ? 15000 : 40000}
            onReady={onReady}
          />
        </Suspense>
        <WorldGeometry progress={progress} />
        {streamModel && (
          <ModelBoundary onError={onError}>
            <Suspense fallback={null}>
              <Samurai
                progress={progress}
                onLoaded={loadedModel}
                onError={onError}
              />
            </Suspense>
          </ModelBoundary>
        )}
      </Canvas>
    </>
  );
}
