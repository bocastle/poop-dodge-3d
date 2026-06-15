import { useFrame } from "@react-three/fiber";
import { useRef, type MutableRefObject } from "react";
import type { Group, MeshBasicMaterial } from "three";
import type { ShieldBurst as ShieldBurstData } from "../types";

type ShieldBurstProps = {
  burst: ShieldBurstData;
  elapsedSecondsRef: MutableRefObject<number>;
};

export function ShieldBurst({ burst, elapsedSecondsRef }: ShieldBurstProps) {
  const ref = useRef<Group>(null);
  const outerMaterialRef = useRef<MeshBasicMaterial>(null);
  const innerMaterialRef = useRef<MeshBasicMaterial>(null);

  useFrame(() => {
    const progress = Math.min(
      1,
      Math.max(
        0,
        (elapsedSecondsRef.current - burst.startedAtSeconds) /
          (burst.expiresAtSeconds - burst.startedAtSeconds)
      )
    );
    const opacity = Math.max(0, 1 - progress);

    if (!ref.current) {
      return;
    }
    const scale = 0.65 + progress * 2.4;
    ref.current.scale.set(scale, scale, scale);
    if (outerMaterialRef.current) {
      outerMaterialRef.current.opacity = opacity * 0.86;
    }
    if (innerMaterialRef.current) {
      innerMaterialRef.current.opacity = opacity * 0.72;
    }
  });

  return (
    <group ref={ref} position={[burst.x, 0.18, burst.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <ringGeometry args={[0.34, 0.42, 40]} />
        <meshBasicMaterial
          ref={outerMaterialRef}
          color="#60a5fa"
          transparent
          opacity={0.86}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <ringGeometry args={[0.5, 0.56, 40]} />
        <meshBasicMaterial
          ref={innerMaterialRef}
          color="#fef08a"
          transparent
          opacity={0.72}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
