import { useFrame } from "@react-three/fiber";
import { useRef, type MutableRefObject } from "react";
import { DoubleSide, type Group } from "three";
import { getShieldPullProgress } from "../feel";
import type { Position, ShieldPickup as ShieldPickupData } from "../types";

type ShieldPickupProps = {
  pickup: ShieldPickupData;
  playerPositionRef: MutableRefObject<Position>;
};

const ink = "#1f2937";
const paper = "#fef08a";
const blue = "#93c5fd";
const deepBlue = "#2563eb";

export function ShieldPickup({ pickup, playerPositionRef }: ShieldPickupProps) {
  const ref = useRef<Group>(null);
  const pulseRef = useRef<Group>(null);
  const iconRef = useRef<Group>(null);

  useFrame((state) => {
    const bobY = 0.34 + Math.sin(state.clock.elapsedTime * 4) * 0.04;

    if (!ref.current) {
      return;
    }
    const playerPosition = playerPositionRef.current;
    const distance = Math.hypot(playerPosition.x - pickup.x, playerPosition.z - pickup.z);
    const pull = getShieldPullProgress(distance);
    const visualX = pickup.x + (playerPosition.x - pickup.x) * pull * 0.28;
    const visualZ = pickup.z + (playerPosition.z - pickup.z) * pull * 0.28;

    ref.current.position.x = visualX;
    ref.current.position.z = visualZ;
    ref.current.position.y = bobY;

    if (pulseRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.08;
      pulseRef.current.scale.set(scale, scale, 1);
    }

    if (iconRef.current) {
      iconRef.current.lookAt(state.camera.position);
      iconRef.current.rotateZ(Math.sin(state.clock.elapsedTime * 6) * 0.08);
    }
  });

  return (
    <group ref={ref} position={[pickup.x, 0.34, pickup.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.25, 0]}>
        <circleGeometry args={[0.48, 28]} />
        <meshBasicMaterial
          color="#9ca3af"
          transparent
          opacity={0.2}
          depthWrite={false}
        />
      </mesh>
      <group ref={pulseRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14, 0]}>
        <mesh>
          <ringGeometry args={[0.36, 0.55, 36]} />
          <meshBasicMaterial
            color={blue}
            transparent
            opacity={0.88}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
        <mesh>
          <circleGeometry args={[0.3, 28]} />
          <meshBasicMaterial
            color={paper}
            transparent
            opacity={0.6}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
        <mesh position={[0, -0.05, 0.012]} scale={[0.42, 0.5, 1]}>
          <circleGeometry args={[0.45, 5]} />
          <meshBasicMaterial
            color={blue}
            transparent
            opacity={0.96}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
        <mesh position={[0, -0.05, 0.018]} scale={[0.29, 0.35, 1]}>
          <circleGeometry args={[0.45, 5]} />
          <meshBasicMaterial
            color={paper}
            transparent
            opacity={0.92}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      </group>
      <group ref={iconRef} position={[0, 0.25, 0]}>
        <mesh scale={[0.47, 0.58, 1]}>
          <circleGeometry args={[1, 5]} />
          <meshBasicMaterial color={ink} side={DoubleSide} depthTest={false} />
        </mesh>
        <mesh position={[0, 0, 0.018]} scale={[0.38, 0.48, 1]}>
          <circleGeometry args={[1, 5]} />
          <meshBasicMaterial color={blue} side={DoubleSide} depthTest={false} />
        </mesh>
        <mesh position={[0, 0.06, 0.036]} scale={[0.2, 0.24, 1]}>
          <circleGeometry args={[1, 5]} />
          <meshBasicMaterial
            color={paper}
            side={DoubleSide}
            depthTest={false}
            transparent
            opacity={0.95}
          />
        </mesh>
        <mesh position={[0, -0.11, 0.04]} scale={[0.12, 0.04, 1]}>
          <circleGeometry args={[1, 18]} />
          <meshBasicMaterial color={deepBlue} side={DoubleSide} depthTest={false} />
        </mesh>
        <mesh position={[-0.46, 0.28, 0.02]} scale={[0.06, 0.06, 1]}>
          <circleGeometry args={[1, 4]} />
          <meshBasicMaterial color={paper} side={DoubleSide} depthTest={false} />
        </mesh>
        <mesh position={[0.44, 0.18, 0.02]} scale={[0.045, 0.045, 1]}>
          <circleGeometry args={[1, 4]} />
          <meshBasicMaterial color={paper} side={DoubleSide} depthTest={false} />
        </mesh>
      </group>
    </group>
  );
}
