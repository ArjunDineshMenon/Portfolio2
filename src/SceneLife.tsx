import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { direct } from "./director";
import { windowAt } from "./timeline";

type Progress = { progress: MutableRefObject<number> };

export function SakuraTree({
  position,
  mirror = 1,
}: {
  position: [number, number, number];
  mirror?: number;
}) {
  const crown = useRef<THREE.Group>(null!);
  const flowers = useRef<THREE.InstancedMesh>(null!);
  const flowerGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const r = 0.7 + 0.3 * Math.cos(a * 5);
      if (!i) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    return new THREE.ShapeGeometry(shape, 3);
  }, []);
  const branches = useMemo(
    () =>
      Array.from({ length: 13 }, (_, i) => {
        const a = i * 2.399;
        const end = new THREE.Vector3(
          Math.cos(a) * (1.4 + (i % 3) * 0.6),
          3.9 + (i % 4) * 0.55,
          Math.sin(a) * 1.8,
        );
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 2.2, 0),
          new THREE.Vector3(end.x * 0.4, 3.3, end.z * 0.4),
          end,
        ]);
        return {
          end,
          geometry: new THREE.TubeGeometry(
            curve,
            10,
            0.045 + (i % 3) * 0.014,
            5,
            false,
          ),
        };
      }),
    [],
  );
  useEffect(() => {
    const dummy = new THREE.Object3D(),
      color = new THREE.Color();
    for (let i = 0; i < 1700; i++) {
      const branch = branches[i % branches.length].end;
      const a = i * 2.39996,
        r = Math.sqrt(((i * 73) % 997) / 997);
      dummy.position.set(
        branch.x + Math.cos(a) * r * 1.1,
        branch.y + Math.sin(i * 18.13) * 0.58 * r,
        branch.z + Math.sin(a) * r * 0.95,
      );
      dummy.rotation.set(i * 1.71, i * 2.3, a);
      dummy.scale.setScalar(0.075 + (i % 7) * 0.014);
      dummy.updateMatrix();
      flowers.current.setMatrixAt(i, dummy.matrix);
      color.setHSL(
        0.94 + (i % 4) * 0.009,
        0.28 + (i % 3) * 0.12,
        0.67 + (i % 5) * 0.055,
      );
      flowers.current.setColorAt(i, color);
    }
    flowers.current.instanceMatrix.needsUpdate = true;
    if (flowers.current.instanceColor)
      flowers.current.instanceColor.needsUpdate = true;
    return () => {
      flowerGeometry.dispose();
      branches.forEach((b) => b.geometry.dispose());
    };
  }, [branches, flowerGeometry]);
  useFrame(({ clock }) => {
    crown.current.rotation.z =
      Math.sin(clock.elapsedTime * 0.43 + position[0]) * 0.015;
    crown.current.rotation.x = Math.cos(clock.elapsedTime * 0.31) * 0.009;
  });
  return (
    <group position={position} scale={[mirror, 1, 1]}>
      <mesh position={[0.1, 1.65, 0]} rotation={[0, 0, -0.1]}>
        <cylinderGeometry args={[0.14, 0.37, 3.3, 9]} />
        <meshStandardMaterial color="#665750" roughness={1} />
      </mesh>
      <group ref={crown}>
        {branches.map((b, i) => (
          <mesh key={i} geometry={b.geometry}>
            <meshStandardMaterial color="#6b5553" roughness={1} />
          </mesh>
        ))}
        <instancedMesh
          ref={flowers}
          args={[flowerGeometry, undefined, 1700]}
          frustumCulled={false}
        >
          <meshBasicMaterial color="white" side={THREE.DoubleSide} />
        </instancedMesh>
      </group>
    </group>
  );
}

function Roof({ y, scale = 1 }: { y: number; scale?: number }) {
  const geo = useMemo(() => {
    const rings = [
      [1.2, 0.95, 0.6],
      [2.3, 0.22, 1.4],
      [2.85, 0.32, 1.85],
    ];
    const vertices: number[] = [];
    const corner = (level: number, i: number) => {
      const [x, y, z] = rings[level];
      return [
        [-x, y, -z],
        [x, y, -z],
        [x, y, z],
        [-x, y, z],
      ][i % 4];
    };
    for (let r = 0; r < 2; r++)
      for (let i = 0; i < 4; i++)
        vertices.push(
          ...corner(r, i),
          ...corner(r + 1, i),
          ...corner(r + 1, i + 1),
          ...corner(r, i),
          ...corner(r + 1, i + 1),
          ...corner(r, i + 1),
        );
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <group position={[0, y, 0]} scale={scale}>
      <mesh geometry={geo}>
        <meshStandardMaterial
          color="#525c61"
          roughness={0.82}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[2.5, 0.13, 0.14]} />
        <meshStandardMaterial color="#697272" />
      </mesh>
    </group>
  );
}

export function Temple({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.14, 0]}>
        <boxGeometry args={[6, 0.28, 4]} />
        <meshStandardMaterial color="#babebc" />
      </mesh>
      <mesh position={[0, 1.7, 0]}>
        <boxGeometry args={[4.5, 2.8, 2.6]} />
        <meshStandardMaterial color="#e7ece6" />
      </mesh>
      {[-2.3, -0.8, 0.8, 2.3].map((x) => (
        <group key={x} position={[x, 0, 1.5]}>
          <mesh position={[0, 1.7, 0]}>
            <cylinderGeometry args={[0.1, 0.13, 3, 8]} />
            <meshStandardMaterial color="#ad443e" />
          </mesh>
          {[-0.45, 0, 0.45].map((y) => (
            <mesh key={y} position={[0, 1.6 + y, -0.15]}>
              <boxGeometry args={[1.4, 0.035, 0.04]} />
              <meshStandardMaterial color="#64665e" />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 2.85, 1.5]}>
        <boxGeometry args={[5.2, 0.22, 0.3]} />
        <meshStandardMaterial color="#ae4c40" />
      </mesh>
      <Roof y={3} />
      <mesh position={[0, 3.9, 0]}>
        <boxGeometry args={[2.4, 0.7, 1.2]} />
        <meshStandardMaterial color="#d9e0d9" />
      </mesh>
      <Roof y={4.1} scale={0.64} />
    </group>
  );
}

export function LivingFuture({ progress, low }: Progress & { low: boolean }) {
  const root = useRef<THREE.Group>(null!);
  const drones = useRef<THREE.Group[]>([]),
    rings = useRef<THREE.Mesh[]>([]);
  const packets = useRef<THREE.InstancedMesh>(null!);
  const { size, gl } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = low ? 60 : 120;
  useFrame(({ clock }) => {
    const d = direct(progress.current, size.width < 760),
      t = clock.elapsedTime;
    root.current.visible = d.scifi > 0.04;
    if (!root.current.visible) return;
    drones.current.forEach((g, i) => {
      const side = i % 2 ? 1 : -1;
      g.position.set(
        side * (3.7 + Math.sin(t * 0.31 + i) * 0.65),
        3.9 + Math.sin(t * 0.7 + i * 3) * 0.4,
        -2 - ((t * 0.7 + i * 7) % 33),
      );
      g.rotation.set(
        Math.sin(t * 0.6 + i) * 0.08,
        side * 0.7 + Math.sin(t * 0.4) * 0.18,
        Math.cos(t * 0.7 + i) * 0.09,
      );
    });
    rings.current.forEach((m, i) => {
      m.rotation.set(
        Math.PI / 2 + Math.sin(t * 0.3 + i) * 0.25,
        0,
        t * (i % 2 ? -0.35 : 0.27),
      );
      m.position.y = 4.5 + Math.sin(t * 0.55 + i) * 0.2;
    });
    for (let i = 0; i < count; i++) {
      const side = i % 2 ? 1 : -1;
      dummy.position.set(
        side * (2.9 + (i % 3) * 0.7),
        0.08 + (i % 5 === 0 ? 4.8 : 0),
        4 - ((i * 2.319 + t * (2.2 + (i % 3))) % 38),
      );
      dummy.scale.set(0.025, 0.025, 0.16 + (i % 4) * 0.07);
      dummy.updateMatrix();
      packets.current.setMatrixAt(i, dummy.matrix);
    }
    packets.current.instanceMatrix.needsUpdate = true;
    gl.domElement.dataset.environmentTime = t.toFixed(2);
  });
  return (
    <group ref={root}>
      {Array.from({ length: low ? 4 : 7 }, (_, i) => (
        <group
          key={i}
          ref={(g) => {
            if (g) drones.current[i] = g;
          }}
        >
          <mesh>
            <boxGeometry args={[0.58, 0.17, 0.36]} />
            <meshStandardMaterial
              color="#d1d8d7"
              metalness={0.7}
              roughness={0.28}
            />
          </mesh>
          <mesh position={[0, 0, 0.185]}>
            <boxGeometry args={[0.32, 0.035, 0.012]} />
            <meshBasicMaterial
              color={i % 2 ? "#efb877" : "#76f6e5"}
              toneMapped={false}
            />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[side * 0.35, -0.05, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <torusGeometry args={[0.13, 0.025, 5, 16]} />
              <meshBasicMaterial color="#6ce4d0" toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}
      {[-7, -15, -23, -31].map((z, i) => (
        <group key={z} position={[i % 2 ? -3.8 : 3.8, 0, z]}>
          <mesh
            ref={(m) => {
              if (m) rings.current[i] = m;
            }}
          >
            <torusGeometry args={[0.85, 0.045, 6, 44, Math.PI * 1.7]} />
            <meshStandardMaterial
              color="#b2c8c9"
              metalness={0.8}
              roughness={0.2}
              emissive="#318d88"
              emissiveIntensity={1.4}
            />
          </mesh>
          <mesh position={[0, 3.6, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 0.35, 6]} />
            <meshStandardMaterial color="#b0bcb8" metalness={0.8} />
          </mesh>
        </group>
      ))}
      <instancedMesh
        ref={packets}
        args={[undefined, undefined, count]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#8ef9dc" toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

export function SamuraiInteraction({
  progress,
  model,
}: Progress & { model: THREE.Object3D }) {
  const group = useRef<THREE.Group>(null!);
  const beam = useRef<THREE.Mesh>(null!);
  const target = useMemo(() => new THREE.Vector3(), []);
  const hand = useMemo(
    () => model.getObjectByName("handL") ?? model.getObjectByName("hand.L"),
    [model],
  );
  const { size } = useThree();
  useFrame(({ clock }) => {
    const d = direct(progress.current, size.width < 760);
    const active = !!d.shot && d.local > 0.52 && d.local < 0.87;
    group.current.visible = active;
    beam.current.visible = active;
    if (!active) return;
    if (hand) hand.getWorldPosition(group.current.position);
    else group.current.position.set(d.actor[0] - 0.3, 1.65, d.actor[2] + 0.4);
    group.current.rotation.set(
      clock.elapsedTime * 0.4,
      clock.elapsedTime * 0.8,
      0,
    );
    group.current.scale.setScalar(
      0.16 + 0.035 * Math.sin(clock.elapsedTime * 2),
    );
    target.set(...d.anchor).sub(group.current.position);
    beam.current.position
      .copy(group.current.position)
      .addScaledVector(target, 0.5);
    beam.current.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      target.clone().normalize(),
    );
    beam.current.scale.set(1, target.length(), 1);
    const mat = beam.current.material as THREE.MeshBasicMaterial;
    mat.opacity =
      windowAt(d.local, 0.52, 0.87, 0.06) *
      (0.17 + 0.09 * Math.sin(clock.elapsedTime * 3));
  });
  return (
    <>
      <group ref={group}>
        <mesh>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial
            color="#95ffe7"
            wireframe
            transparent
            opacity={0.85}
            toneMapped={false}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.45, 0.024, 5, 32]} />
          <meshBasicMaterial color="#f0c994" />
        </mesh>
      </group>
      <mesh ref={beam}>
        <cylinderGeometry args={[0.009, 0.003, 1, 5]} />
        <meshBasicMaterial
          color="#7fe1d4"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}
