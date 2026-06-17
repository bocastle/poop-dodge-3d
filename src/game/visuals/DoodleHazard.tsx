import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { BackSide } from "three";
import type { Group, MeshBasicMaterial } from "three";
import type { Obstacle } from "../types";
import { getHazardVisualState } from "./doodleStyle";

type DoodleHazardProps = {
  obstacle: Obstacle;
};

const ink = "#1f2937";
const brown = "#92400e";
const darkBrown = "#78350f";
const highlight = "#fbbf24";

export function DoodleHazard({ obstacle }: DoodleHazardProps) {
  const groupRef = useRef<Group>(null);
  const shadowRef = useRef<Group>(null);
  const shadowMaterialRef = useRef<MeshBasicMaterial>(null);
  const bodyRef = useRef<Group>(null);
  const initialVisualState = getHazardVisualState(obstacle.y, obstacle.radius);

  useFrame(() => {
    const visualState = getHazardVisualState(obstacle.y, obstacle.radius);

    groupRef.current?.position.set(obstacle.x, obstacle.y, obstacle.z);

    if (shadowRef.current) {
      shadowRef.current.position.y = -obstacle.y + 0.02;
      shadowRef.current.scale.set(
        visualState.shadowScale,
        visualState.shadowScale * 0.42,
        1
      );
    }

    if (shadowMaterialRef.current) {
      shadowMaterialRef.current.opacity = visualState.shadowOpacity;
    }

    if (bodyRef.current) {
      bodyRef.current.rotation.set(
        obstacle.rotation,
        obstacle.rotation * 0.35,
        obstacle.rotation * 0.22
      );
      bodyRef.current.scale.set(
        obstacle.radius,
        obstacle.radius * visualState.squash,
        obstacle.radius
      );
    }
  });

  return (
    <group ref={groupRef} position={[obstacle.x, obstacle.y, obstacle.z]}>
      <group
        ref={shadowRef}
        position={[0, -obstacle.y + 0.02, 0]}
        scale={[
          initialVisualState.shadowScale,
          initialVisualState.shadowScale * 0.42,
          1,
        ]}
      >
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1, 28]} />
          <meshBasicMaterial
            ref={shadowMaterialRef}
            color={ink}
            transparent
            opacity={initialVisualState.shadowOpacity}
            depthWrite={false}
          />
        </mesh>
      </group>

      <group
        ref={bodyRef}
        rotation={[
          obstacle.rotation,
          obstacle.rotation * 0.35,
          obstacle.rotation * 0.22,
        ]}
        scale={[
          obstacle.radius,
          obstacle.radius * initialVisualState.squash,
          obstacle.radius,
        ]}
      >
        <PoopBlob y={-0.16} scale={[1.25, 0.48, 0.9]} color={darkBrown} />
        <PoopBlob y={0.1} scale={[0.94, 0.42, 0.76]} color={brown} />
        <PoopBlob y={0.34} scale={[0.56, 0.32, 0.5]} color={brown} />

        <mesh
          position={[0.16, 0.5, 0]}
          rotation={[0, 0, -0.58]}
          scale={[0.28, 0.16, 0.24]}
        >
          <sphereGeometry args={[1, 16, 10]} />
          <meshBasicMaterial color={ink} side={BackSide} />
        </mesh>
        <mesh
          position={[0.15, 0.51, 0.02]}
          rotation={[0, 0, -0.58]}
          scale={[0.18, 0.1, 0.16]}
        >
          <sphereGeometry args={[1, 16, 10]} />
          <meshStandardMaterial color={brown} roughness={0.86} metalness={0} />
        </mesh>
        <mesh position={[-0.25, 0.21, 0.58]} scale={[0.18, 0.05, 0.04]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshBasicMaterial color={highlight} transparent opacity={0.58} />
        </mesh>
      </group>
    </group>
  );
}

function PoopBlob({
  color,
  scale,
  y,
}: {
  color: string;
  scale: [number, number, number];
  y: number;
}) {
  return (
    <>
      <mesh
        position={[0, y, 0]}
        scale={[scale[0] * 1.12, scale[1] * 1.16, scale[2] * 1.12]}
      >
        <sphereGeometry args={[1, 20, 12]} />
        <meshBasicMaterial color={ink} side={BackSide} />
      </mesh>
      <mesh position={[0, y + 0.01, 0.03]} scale={scale}>
        <sphereGeometry args={[1, 20, 12]} />
        <meshStandardMaterial color={color} roughness={0.88} metalness={0} />
      </mesh>
    </>
  );
}
