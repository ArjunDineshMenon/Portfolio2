import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { direct } from "./director";

export function Portals({ progress }: { progress: MutableRefObject<number> }) {
  const group = useRef<THREE.Group>(null!);
  const rings = useRef<THREE.Mesh[]>([]);
  const { size } = useThree();
  const particles = useRef<THREE.Points>(null!);
  const lastP = useRef(-1);
  const lastWidth = useRef(0);
  const positions = useMemo(() => {
    const a = new Float32Array(2400 * 3);
    for (let i = 0; i < 2400; i++) {
      const theta = i * 2.39996,
        r = 1.5 + ((i % 29) / 29) * 3.7;
      a.set(
        [Math.cos(theta) * r, Math.sin(theta) * r, -(i % 120) * 0.22],
        i * 3,
      );
    }
    return a;
  }, []);
  useFrame(() => {
    if (lastP.current === progress.current && lastWidth.current === size.width)
      return;
    lastP.current = progress.current;
    lastWidth.current = size.width;
    const d = direct(progress.current, size.width < 760);
    group.current.visible = d.warp > 0.001;
    group.current.position.set(0, 1.65, d.camera[2] - 3.9);
    group.current.rotation.z = d.p * 6 + d.warp * d.p * 30;
    rings.current.forEach((m, i) => {
      m.rotation.set(
        Math.sin(d.p * 19 + i) * 0.13,
        Math.cos(d.p * 23 + i) * 0.12,
        d.p * (12 + i * 7),
      );
      m.scale.setScalar(0.65 + d.warp * 0.6);
      (m.material as THREE.MeshBasicMaterial).opacity =
        d.warp * (i % 2 ? 0.22 : 0.66);
    });
    particles.current.rotation.z = d.p * 60 + d.warp * d.p * 120;
    particles.current.position.z = (d.p * 150) % 4;
    (particles.current.material as THREE.PointsMaterial).opacity =
      d.warp * 0.75;
  });
  return (
    <group ref={group}>
      {Array.from({ length: 10 }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            if (m) rings.current[i] = m;
          }}
          position={[0, 0, -i * 1.65]}
        >
          <torusGeometry
            args={[
              2.3 + (i % 2) * 0.22,
              i % 2 ? 0.009 : 0.024,
              5,
              112,
              Math.PI * (i % 3 === 0 ? 1.78 : 2),
            ]}
          />
          <meshBasicMaterial
            color={i % 3 === 0 ? "#edbd83" : "#82e9f7"}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
      <points ref={particles}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#a4f5ff"
          size={0.045}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <pointLight color="#92eaff" intensity={10} distance={10} />
    </group>
  );
}

export function HologramSurfaces({
  progress,
}: {
  progress: MutableRefObject<number>;
}) {
  const group = useRef<THREE.Group>(null!);
  const frame = useRef<THREE.LineSegments>(null!);
  const seal = useRef<THREE.Mesh>(null!);
  const frameGeometry = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(3.75, 3.3, 0.065)),
    [],
  );
  const shards = useRef<THREE.InstancedMesh>(null!);
  const slash = useRef<THREE.Mesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const { size } = useThree();
  useFrame(() => {
    const d = direct(progress.current, size.width < 760),
      mobile = size.width < 760;
    group.current.visible = !!d.shot;
    if (!group.current.visible) return;
    group.current.position.set(...d.anchor);
    group.current.position.z -= 0.1;
    group.current.scale.set(mobile ? 0.65 : 1, mobile ? 0.66 : 1, 1);
    (frame.current.material as THREE.LineBasicMaterial).opacity =
      (0.27 - d.reveal * 0.22) * (1 - d.dissolve);
    seal.current.rotation.z = d.p * 4;
    seal.current.scale.setScalar(1 - d.reveal * 0.3);
    (seal.current.material as THREE.MeshBasicMaterial).opacity =
      (1 - d.reveal) * 0.6;
    slash.current.visible = d.impact > 0.001 || d.dissolve > 0.02;
    slash.current.rotation.z = -0.08;
    slash.current.position.y = (d.local - 0.4) * 1.5;
    slash.current.scale.x = 0.2 + d.impact * 1.3 + d.dissolve;
    (slash.current.material as THREE.MeshBasicMaterial).opacity = Math.max(
      d.impact,
      d.dissolve * (1 - d.dissolve) * 4,
    );
    const burst = d.dissolve;
    for (let i = 0; i < 36; i++) {
      const x = ((i % 6) - 2.5) * 0.62,
        y = (Math.floor(i / 6) - 2.5) * 0.52;
      dummy.position.set(
        x * (1 + burst * 1.6),
        y * (1 + burst * 0.9),
        -0.15 - burst * (1 + (i % 4)) * 0.65,
      );
      dummy.rotation.set(
        burst * Math.sin(i * 71) * 3,
        burst * Math.cos(i * 19) * 2,
        burst * Math.sin(i * 13),
      );
      dummy.scale.setScalar(0.92 - burst * 0.72);
      dummy.updateMatrix();
      shards.current.setMatrixAt(i, dummy.matrix);
    }
    shards.current.instanceMatrix.needsUpdate = true;
    (shards.current.material as THREE.MeshBasicMaterial).opacity =
      burst > 0 ? Math.sin(burst * Math.PI) * 0.42 : 0;
  });
  return (
    <group ref={group}>
      <lineSegments ref={frame} geometry={frameGeometry}>
        <lineBasicMaterial color="#82dae2" transparent depthWrite={false} />
      </lineSegments>
      <mesh ref={seal}>
        <ringGeometry args={[0.7, 0.705, 64, 1, 0, Math.PI * 1.8]} />
        <meshBasicMaterial
          color="#77cad8"
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={slash} position={[0, 0, 0.04]}>
        <planeGeometry args={[3.9, 0.018]} />
        <meshBasicMaterial
          color="#c4fcff"
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <instancedMesh
        ref={shards}
        args={[undefined, undefined, 36]}
        frustumCulled={false}
      >
        <planeGeometry args={[0.57, 0.48]} />
        <meshBasicMaterial
          color="#77ddeb"
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>
    </group>
  );
}

const flashVertex = `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const flashFragment = `varying vec2 vUv;uniform float uFlash;uniform float uWarp;void main(){float edge=pow(length((vUv-.5)*vec2(1.,.8))*1.4,3.);vec3 color=mix(vec3(.12,.47,.61),vec3(.7,.94,1.),uFlash);gl_FragColor=vec4(color,uFlash*.87+edge*uWarp*.12);}`;
export function PortalFlash({
  progress,
}: {
  progress: MutableRefObject<number>;
}) {
  const { size } = useThree();
  const material = useRef<THREE.ShaderMaterial>(null!);
  const uniforms = useMemo(
    () => ({ uFlash: { value: 0 }, uWarp: { value: 0 } }),
    [],
  );
  useFrame(() => {
    const d = direct(progress.current, size.width < 760);
    material.current.uniforms.uFlash.value = d.flash;
    material.current.uniforms.uWarp.value = d.warp;
  });
  return (
    <mesh frustumCulled={false} renderOrder={1000}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={flashVertex}
        fragmentShader={flashFragment}
        transparent
        depthTest={false}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
