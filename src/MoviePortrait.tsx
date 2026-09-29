import { useMemo, useRef, useEffect, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { direct } from "./director";
import { smooth, windowAt } from "./timeline";

const vertex = `attribute vec3 target;attribute float seed;attribute float luminance;uniform float uP;uniform float uForm;uniform float uBurst;uniform float uRatio;varying float vAlpha;varying vec3 vColor;
void main(){float orbit=uP*34.;float swirl=orbit+seed*19.;vec3 cloud=position;
cloud.xz=mat2(cos(swirl*.24),-sin(swirl*.24),sin(swirl*.24),cos(swirl*.24))*cloud.xz;
cloud.x+=sin(swirl*1.4+cloud.y)*.7;cloud.y+=cos(swirl+seed*51.)*.6;
vec3 pt=mix(cloud,target,uForm);
float split=smoothstep(.405,.432,uP);float sideSign=target.y>-.05?1.:-1.;pt.xy+=vec2(sideSign*split*1.3,sideSign*split*.35);
float tunnel=smoothstep(.414,.47,uP);float twist=tunnel*tunnel*16.;
vec3 explode=vec3(sin(seed*713.)*(3.+seed*7.),cos(seed*281.)*(3.+seed*5.),-seed*36.);
pt+=explode*uBurst;
pt.xy=mat2(cos(twist),-sin(twist),sin(twist),cos(twist))*pt.xy;
vec4 mv=modelViewMatrix*vec4(pt,1.);gl_Position=projectionMatrix*mv;
gl_PointSize=clamp((1.5+seed*2.0)*uRatio*(7./-mv.z),.8,5.);
float portrait= smoothstep(.175,.20,uP)*(1.-smoothstep(.397,.422,uP));
vAlpha=(.24+uForm*.65)*(1.-portrait*.94)*(1.-smoothstep(.448,.475,uP));
vColor=mix(vec3(.19,.5,.64),vec3(.54,.97,1.),seed)*mix(1.,.16+luminance*1.5,uForm);}`;
const fragment = `varying float vAlpha;varying vec3 vColor;void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;gl_FragColor=vec4(vColor,(1.-smoothstep(.02,.5,r))*vAlpha);}`;
const faceVertex = `varying vec2 vUv;uniform float uSplit;uniform float uHalf;void main(){vUv=uv;vec3 p=position;float a=uHalf*uSplit*.075;p.xy=mat2(cos(a),-sin(a),sin(a),cos(a))*p.xy;p.xy+=vec2(uHalf*uSplit*1.3,uHalf*uSplit*.35);p.z+=abs(uSplit)*.1;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
const faceFragment = `varying vec2 vUv;uniform sampler2D uMap;uniform float uAlpha;uniform float uHalf;uniform float uP;void main(){float cut=vUv.y-.52+(vUv.x-.5)*.08;if(cut*uHalf<0.)discard;vec4 c=texture2D(uMap,vUv);float dissolve=smoothstep(.408,.438,uP);float noise=fract(sin(dot(floor(vUv*480.),vec2(12.98,78.23)))*43758.5453);if(noise<dissolve)discard;float holo=smoothstep(.31,.345,uP);float scan=1.-holo*(.12+.12*sin(vUv.y*650.+uP*300.));vec3 color=mix(c.rgb,dot(c.rgb,vec3(.21,.72,.07))*vec3(.1,1.05,1.4),holo*.8);color+=vec3(.1,.9,1.)*(1.-smoothstep(0.,.009,abs(cut)))*smoothstep(.345,.35,uP)*2.;gl_FragColor=vec4(color*scan,c.a*uAlpha);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;

export function MoviePortrait({
  progress,
  low,
  onReady,
}: {
  progress: MutableRefObject<number>;
  low: boolean;
  onReady: () => void;
}) {
  const map = useTexture(
    `${import.meta.env.BASE_URL}assets/images/arjun-face-cutout.webp`,
  );
  const group = useRef<THREE.Group>(null!),
    material = useRef<THREE.ShaderMaterial>(null!),
    halo = useRef<THREE.Mesh>(null!);
  const faceMaterials = useRef<THREE.ShaderMaterial[]>([]);
  const { gl, size } = useThree();
  const count = low ? 12000 : 24000;
  const data = useMemo(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 320;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(map.image, 0, 0, 256, 320);
    const rgba = ctx.getImageData(0, 0, 256, 320).data;
    const mask: number[] = [];
    for (let i = 0; i < rgba.length; i += 4)
      if (rgba[i + 3] > 90) mask.push(i / 4);
    let state = 81;
    const rand = () => {
      state = (state * 16807) % 2147483647;
      return state / 2147483647;
    };
    const origin = new Float32Array(count * 3),
      target = new Float32Array(count * 3),
      seeds = new Float32Array(count),
      luminance = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const pixel = mask[Math.floor(rand() * mask.length)],
        x = (pixel % 256) / 256 - 0.5,
        y = 0.5 - Math.floor(pixel / 256) / 320;
      const a = rand() * Math.PI * 2,
        r = 2 + rand() * 5;
      origin.set([Math.cos(a) * r, (rand() - 0.5) * 7, Math.sin(a) * r], i * 3);
      target.set(
        [
          x * 2.25,
          y * 2.82,
          0.3 * Math.exp(-x * x * 10 - y * y * 5) + (rand() - 0.5) * 0.1,
        ],
        i * 3,
      );
      seeds[i] = rand();
      luminance[i] =
        (rgba[pixel * 4] * 0.2126 +
          rgba[pixel * 4 + 1] * 0.7152 +
          rgba[pixel * 4 + 2] * 0.0722) /
        255;
    }
    return { origin, target, seeds, luminance };
  }, [map, count]);
  const uniforms = useMemo(
    () => ({
      uP: { value: 0 },
      uForm: { value: 0 },
      uBurst: { value: 0 },
      uRatio: { value: 1 },
    }),
    [],
  );
  const faces = useMemo(
    () =>
      [-1, 1].map((half) => ({
        uMap: { value: map },
        uAlpha: { value: 0 },
        uHalf: { value: half },
        uSplit: { value: 0 },
        uP: { value: 0 },
      })),
    [map],
  );
  useEffect(onReady, [onReady]);
  useFrame(() => {
    const p = progress.current,
      d = direct(p, size.width < 760),
      mobile = size.width < 760;
    group.current.visible = p < 0.48;
    if (!group.current.visible) return;
    const x = d.faceX;
    group.current.position.set(
      x,
      mobile ? 2.35 : 2.25,
      smooth(0.414, 0.47, p) * -7,
    );
    group.current.scale.setScalar(d.faceScale);
    group.current.rotation.y = (1 - smooth(0.12, 0.19, p)) * Math.PI * 2;
    const u = material.current.uniforms;
    u.uP.value = p;
    u.uForm.value = smooth(0.075, 0.17, p);
    u.uBurst.value = d.faceBurst;
    u.uRatio.value = gl.getPixelRatio();
    faceMaterials.current.forEach((m) => {
      const u = m.uniforms;
      u.uAlpha.value = smooth(0.175, 0.2, p) * (1 - smooth(0.426, 0.44, p));
      u.uSplit.value = d.faceSplit;
      u.uP.value = p;
    });
    (halo.current.material as THREE.MeshBasicMaterial).opacity =
      windowAt(p, 0.145, 0.43, 0.025) * 0.4;
    halo.current.rotation.z = p * 5;
  });
  return (
    <group ref={group}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[data.origin, 3]}
          />
          <bufferAttribute attach="attributes-target" args={[data.target, 3]} />
          <bufferAttribute attach="attributes-seed" args={[data.seeds, 1]} />
          <bufferAttribute
            attach="attributes-luminance"
            args={[data.luminance, 1]}
          />
        </bufferGeometry>
        <shaderMaterial
          ref={material}
          uniforms={uniforms}
          vertexShader={vertex}
          fragmentShader={fragment}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      {faces.map((u, i) => (
        <mesh key={i} position={[0, 0, 0.34]}>
          <planeGeometry args={[2.25, 2.82]} />
          <shaderMaterial
            ref={(m) => {
              if (m) faceMaterials.current[i] = m;
            }}
            uniforms={u}
            vertexShader={faceVertex}
            fragmentShader={faceFragment}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      <mesh ref={halo} position={[0, 0, -0.15]}>
        <ringGeometry args={[1.7, 1.705, 128]} />
        <meshBasicMaterial
          color="#77ceda"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
