import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { direct } from "./director";
const base = import.meta.env.BASE_URL;

function Lantern({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.3, 0.36, 0.24, 8]} />
        <meshStandardMaterial color="#20282b" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.47, 0]}>
        <cylinderGeometry args={[0.09, 0.12, 0.7, 8]} />
        <meshStandardMaterial color="#25292b" />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[0.38, 0.49, 0.38]} />
        <meshStandardMaterial
          color="#4d2612"
          emissive="#e88725"
          emissiveIntensity={0.62}
        />
      </mesh>
      {[-0.13, 0, 0.13].map((y) => (
        <mesh key={y} position={[0, 0.95 + y, 0]}>
          <boxGeometry args={[0.405, 0.012, 0.405]} />
          <meshStandardMaterial color="#201813" />
        </mesh>
      ))}
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => (
          <mesh key={`${x}${z}`} position={[x * 0.2, 0.95, z * 0.2]}>
            <boxGeometry args={[0.05, 0.58, 0.05]} />
            <meshStandardMaterial color="#192124" />
          </mesh>
        )),
      )}
      <mesh position={[0, 1.27, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.43, 0.25, 4]} />
        <meshStandardMaterial color="#121d24" />
      </mesh>
      <mesh position={[0, 1.42, 0]}>
        <sphereGeometry args={[0.055, 8, 8]} />
        <meshStandardMaterial color="#131d23" />
      </mesh>
      <pointLight
        color="#ffb65e"
        intensity={3.5}
        distance={4.5}
        position={[0, 1, 0]}
      />
    </group>
  );
}
function Gate({ z, scale = 1 }: { z: number; scale?: number }) {
  return (
    <group position={[0, 0, z]} scale={scale}>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 4.1, 0, 0]}>
          <mesh position={[0, 2.4, 0]} rotation={[0, 0, -s * 0.022]}>
            <cylinderGeometry args={[0.23, 0.3, 4.8, 12]} />
            <meshStandardMaterial
              color="#1b252b"
              roughness={0.58}
              metalness={0.22}
            />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.42, 0.5, 0.4, 8]} />
            <meshStandardMaterial color="#293238" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 4.6, 0]}>
        <boxGeometry args={[9.8, 0.28, 0.45]} />
        <meshStandardMaterial color="#19242b" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0, 3.65, 0]}>
        <boxGeometry args={[9, 0.22, 0.3]} />
        <meshStandardMaterial color="#273239" />
      </mesh>
      <mesh position={[0, 4.1, 0]}>
        <boxGeometry args={[0.24, 0.9, 0.28]} />
        <meshStandardMaterial color="#222d34" />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 4.6, 4.74, 0]} rotation={[0, 0, s * 0.08]}>
          <boxGeometry args={[1.6, 0.19, 0.56]} />
          <meshStandardMaterial
            color="#111f27"
            metalness={0.5}
            roughness={0.5}
          />
        </mesh>
      ))}
    </group>
  );
}

const floorVertex = `varying vec3 vWorld; void main(){vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const floorFragment = `varying vec3 vWorld;uniform float uSci;uniform float uTime;uniform vec3 uCamera;uniform sampler2D uCourt;uniform sampler2D uFuture;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
  void main(){vec2 p=vWorld.xz;float n=noise(p*2.7)*.6+noise(p*13.)*.26+noise(p*53.)*.14;
  vec2 paving=p*vec2(.66,1.);paving.x+=mod(floor(paving.y),2.)*.5;
  vec2 cell=abs(fract(paving)-.5);float seam=smoothstep(.48,.5,max(cell.x,cell.y));
  float stone=hash(floor(paving));float wet=smoothstep(.25,.7,noise(p*.7));
  vec3 ray=reflect(normalize(vWorld-uCamera),vec3(0,1,0));ray.xz+=vec2(n-.5,sin(p.y*12.+uTime*.3)*.006)*.024;
  vec3 hit=vWorld+ray*((-24.-vWorld.z)/min(ray.z,-.001));vec2 uv=vec2(hit.x/61.+.5,(hit.y-7.)/34.3+.5);
  vec3 reflection=texture2D(uCourt,clamp(uv,0.,1.)).rgb;
  hit=vWorld+ray*((-52.-vWorld.z)/min(ray.z,-.001));uv=vec2(hit.x/64.+.5,(hit.y-8.)/36.+.5);
  reflection=mix(reflection,texture2D(uFuture,clamp(uv,0.,1.)).rgb,uSci);
  float fresnel=pow(1.-abs(ray.y),3.);vec3 c=mix(vec3(.004,.009,.013),vec3(.005,.014,.022),uSci)*(1.+n*.7+stone*.4);
  c+=reflection*(.12+fresnel*.32)*wet;
  c*=1.-seam*.57;
  float lamp=exp(-abs(abs(p.x)-4.2)*4.)*pow(.5+.5*cos((p.y+1.)*1.047),12.);
  c+=vec3(.14,.048,.009)*lamp*(1.-uSci)*(.35+n*.65);
  float road=exp(-abs(abs(p.x)-2.9)*55.);float pulse=.48+.12*sin(p.y*1.3+uTime*.5);
  c+=vec3(.025,.18,.22)*road*uSci*pulse;
  float fog=1.-exp(-length(p-uCamera.xz)*.004);c=mix(c,vec3(.008,.018,.025),fog);
  gl_FragColor=vec4(c,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  }`;

export function MovieWorld({
  progress,
}: {
  progress: MutableRefObject<number>;
}) {
  const [courtyard, scifi] = useTexture([
    `${base}assets/images/japanese-night-environment.webp`,
    `${base}assets/images/scifi-portal-environment.webp`,
  ]);
  useMemo(() => {
    courtyard.colorSpace = THREE.SRGBColorSpace;
    scifi.colorSpace = THREE.SRGBColorSpace;
  }, [courtyard, scifi]);
  const court = useRef<THREE.Group>(null!),
    future = useRef<THREE.Group>(null!);
  const backCourt = useRef<THREE.MeshBasicMaterial>(null!),
    backFuture = useRef<THREE.MeshBasicMaterial>(null!);
  const floor = useRef<THREE.ShaderMaterial>(null!);
  const { size, camera } = useThree();
  const uniforms = useMemo(
    () => ({
      uSci: { value: 0 },
      uTime: { value: 0 },
      uCamera: { value: new THREE.Vector3() },
      uCourt: { value: courtyard },
      uFuture: { value: scifi },
    }),
    [courtyard, scifi],
  );
  useFrame(({ clock }) => {
    const d = direct(progress.current, size.width < 760);
    court.current.visible = d.scifi < 0.85;
    future.current.visible = d.scifi > 0.06;
    backCourt.current.opacity = 1 - d.scifi;
    backFuture.current.opacity = d.scifi;
    floor.current.uniforms.uSci.value = d.scifi;
    floor.current.uniforms.uTime.value = clock.elapsedTime;
    floor.current.uniforms.uCamera.value.copy(camera.position);
  });
  return (
    <>
      <mesh position={[0, 7, -24]}>
        <planeGeometry args={[61, 34.3]} />
        <meshBasicMaterial
          ref={backCourt}
          map={courtyard}
          color="#abbfcf"
          transparent
          depthWrite={false}
          fog={false}
        />
      </mesh>
      <mesh position={[0, 8, -52]}>
        <planeGeometry args={[64, 36]} />
        <meshBasicMaterial
          ref={backFuture}
          map={scifi}
          color="#8caebf"
          transparent
          depthWrite={false}
          fog={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.025, -15]}>
        <planeGeometry args={[100, 120, 1, 1]} />
        <shaderMaterial
          ref={floor}
          uniforms={uniforms}
          vertexShader={floorVertex}
          fragmentShader={floorFragment}
        />
      </mesh>
      <group ref={court}>
        <Gate z={-6} />
        <Gate z={-15} scale={1.06} />
        {[-4.2, 4.2].flatMap((x) =>
          [2, -4, -10].map((z) => (
            <Lantern key={`${x}${z}`} position={[x, 0, z]} />
          )),
        )}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 6, 0, -2]}>
            <mesh position={[0, 3.3, 0]} rotation={[0, 0, -s * 0.1]}>
              <cylinderGeometry args={[0.14, 0.45, 6.6, 9]} />
              <meshStandardMaterial color="#101b21" />
            </mesh>
            {[1, 2, 3].map((i) => (
              <mesh
                key={i}
                position={[-s * i * 0.35, 4.3 + i * 0.35, 0]}
                rotation={[0.2, 0, s * 0.65]}
              >
                <cylinderGeometry args={[0.035, 0.12, 2.6, 7]} />
                <meshStandardMaterial color="#101b21" />
              </mesh>
            ))}
          </group>
        ))}
      </group>
      <group ref={future}>
        {[-5, -10, -15, -20, -25, -31].flatMap((z, i) =>
          [-1, 1].map((s) => (
            <group key={`${z}${s}`} position={[s * (4.6 + i * 0.04), 0, z]}>
              <mesh position={[0, 2.8, 0]}>
                <boxGeometry args={[0.35, 5.6, 0.5]} />
                <meshStandardMaterial
                  color="#162833"
                  metalness={0.8}
                  roughness={0.27}
                />
              </mesh>
              <mesh position={[-s * 0.19, 2.9, 0.12]}>
                <boxGeometry args={[0.035, 4.9, 0.065]} />
                <meshBasicMaterial
                  color={i % 2 ? "#b48959" : "#69cedc"}
                  toneMapped={false}
                />
              </mesh>
              <mesh position={[-s * 0.7, 5.4, 0]} rotation={[0, 0, -s * 0.25]}>
                <boxGeometry args={[1.8, 0.16, 0.34]} />
                <meshStandardMaterial
                  color="#294351"
                  metalness={0.65}
                  roughness={0.25}
                />
              </mesh>
            </group>
          )),
        )}
        {[-4, -8, -12.4, -16, -20, -23].map((z, i) => (
          <group key={z} position={[0, 0, z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
              <ringGeometry args={[2.4, 2.42, 96]} />
              <meshBasicMaterial
                color={i % 2 ? "#c29358" : "#63bfcf"}
                transparent
                opacity={0.5}
                side={THREE.DoubleSide}
              />
            </mesh>
            {[-1, 1].map((s) => (
              <group
                key={s}
                position={[s * 4.5, 1.3, -0.3]}
                rotation={[0, s * 0.25, 0]}
              >
                <mesh>
                  <boxGeometry args={[0.75, 2.6, 0.13]} />
                  <meshStandardMaterial
                    color="#09141c"
                    metalness={0.75}
                    roughness={0.23}
                  />
                </mesh>
                <mesh position={[s * 0.37, 0, 0.075]}>
                  <planeGeometry args={[0.018, 2.4]} />
                  <meshBasicMaterial color="#4a9aa9" />
                </mesh>
              </group>
            ))}
          </group>
        ))}
        <pointLight
          position={[0, 4, -8]}
          color="#61dfff"
          intensity={16}
          distance={12}
        />
        <pointLight
          position={[0, 4, -18]}
          color="#5fcfe7"
          intensity={16}
          distance={12}
        />
      </group>
    </>
  );
}

const hazeVertex = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const hazeFragment = `varying vec2 vUv;uniform float uTime;uniform float uOpacity;void main(){float wave=sin(vUv.x*16.+uTime*.11+sin(vUv.x*7.-uTime*.08))*0.08;float a=exp(-pow((vUv.y-.38-wave)*4.,2.))*sin(vUv.x*3.14159);gl_FragColor=vec4(.21,.38,.43,a*uOpacity);}`;
export function WindAndAtmosphere({
  progress,
  low,
}: {
  progress: MutableRefObject<number>;
  low: boolean;
}) {
  const leaves = useRef<THREE.InstancedMesh>(null!);
  const fog = useRef<THREE.Group>(null!);
  const dust = useRef<THREE.Points>(null!);
  const t = useRef(0);
  const { size } = useThree();
  const count = low ? 38 : 100;
  const geo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.68);
    [
      [-0.13, -0.13],
      [-0.4, -0.23],
      [-0.29, 0.04],
      [-0.75, 0.21],
      [-0.41, 0.28],
      [-0.5, 0.64],
      [-0.2, 0.48],
      [0, 0.97],
      [0.2, 0.48],
      [0.5, 0.64],
      [0.41, 0.28],
      [0.75, 0.21],
      [0.29, 0.04],
      [0.4, -0.23],
      [0.13, -0.13],
      [0, -0.68],
    ].forEach(([x, y]) => shape.lineTo(x, y));
    const g = new THREE.ShapeGeometry(shape);
    const p = g.getAttribute("position");
    for (let i = 0; i < p.count; i++)
      p.setZ(i, Math.abs(p.getX(i)) * 0.23 + Math.sin(p.getY(i) * 4) * 0.04);
    g.computeVertexNormals();
    return g;
  }, []);
  const positions = useMemo(() => {
    const p = new Float32Array((low ? 650 : 1800) * 3);
    for (let i = 0; i < p.length / 3; i++)
      p.set(
        [
          Math.sin(i * 91.1) * 13,
          Math.abs(Math.cos(i * 73.2)) * 8,
          -(i % 100) * 0.6,
        ],
        i * 3,
      );
    return p;
  }, [low]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const ice = useMemo(() => new THREE.Color("#64c9d3"), []);
  const hazeMaterials = useRef<THREE.ShaderMaterial[]>([]);
  const hazeUniforms = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => ({
        uTime: { value: 0 },
        uOpacity: { value: 0.07 - i * 0.009 },
      })),
    [],
  );
  useFrame((_, delta) => {
    t.current += Math.min(delta, 0.05);
    const d = direct(progress.current, size.width < 760);
    const wind = t.current * 0.33 + progress.current * 37;
    for (let i = 0; i < count; i++) {
      const seed = (i * 73.713) % 1;
      const x = ((((i * 2.718 + wind * (0.7 + seed)) % 26) + 26) % 26) - 13;
      const y = 0.3 + ((((i * 1.137 - wind * 0.2) % 6) + 6) % 6);
      const z = d.camera[2] - 2 - ((i * 1.73 + wind * 0.13) % 29);
      dummy.position.set(
        x + Math.sin(wind + i) * 0.65,
        y + Math.sin(wind * 0.7 + i) * 0.3,
        z,
      );
      dummy.rotation.set(
        i + wind * (0.6 + seed),
        wind + i * 0.37,
        Math.sin(wind + i) * 1.3,
      );
      dummy.scale.setScalar(0.04 + seed * 0.085);
      dummy.updateMatrix();
      leaves.current.setMatrixAt(i, dummy.matrix);
      color
        .setHSL(0.028 + (i % 5) * 0.009, 0.78, 0.15 + (i % 3) * 0.055)
        .lerp(ice, d.scifi * 0.72);
      leaves.current.setColorAt(i, color);
    }
    leaves.current.instanceMatrix.needsUpdate = true;
    if (leaves.current.instanceColor)
      leaves.current.instanceColor.needsUpdate = true;
    (leaves.current.material as THREE.MeshStandardMaterial).opacity =
      1 - d.scifi * 0.6;
    fog.current.position.z = d.camera[2] - 9;
    hazeMaterials.current.forEach((m, i) => {
      m.uniforms.uTime.value = t.current + i * 7 + progress.current * 30;
      m.uniforms.uOpacity.value = (0.065 + d.warp * 0.1) / (1 + i * 0.5);
    });
    dust.current.position.z = d.camera[2] - 2 + ((wind * 0.3) % 3);
    dust.current.rotation.z =
      Math.sin(wind * 0.07) * 0.04 + d.warp * progress.current * 8;
  });
  return (
    <>
      <instancedMesh
        ref={leaves}
        args={[geo, undefined, count]}
        frustumCulled={false}
      >
        <meshStandardMaterial
          color="white"
          roughness={0.72}
          metalness={0.12}
          side={THREE.DoubleSide}
          transparent
        />
      </instancedMesh>
      <points ref={dust} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#9ac7ce"
          size={low ? 0.018 : 0.023}
          sizeAttenuation
          transparent
          opacity={0.36}
          depthWrite={false}
        />
      </points>
      <group ref={fog}>
        {hazeUniforms.map((u, i) => (
          <mesh key={i} position={[Math.sin(i) * 2, 0.5 + i * 0.45, -i * 5]}>
            <planeGeometry args={[24, 4]} />
            <shaderMaterial
              ref={(m) => {
                if (m) hazeMaterials.current[i] = m;
              }}
              uniforms={u}
              vertexShader={hazeVertex}
              fragmentShader={hazeFragment}
              transparent
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>
    </>
  );
}
