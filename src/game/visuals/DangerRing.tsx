import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group, MeshBasicMaterial } from "three";
import type { Obstacle } from "../types";
import { getDoodleWarningState } from "./doodleStyle";

type DangerRingProps = {
  obstacle: Obstacle;
};

export function DangerRing({ obstacle }: DangerRingProps) {
  const groupRef = useRef<Group>(null);
  const materialRefs = useRef<MeshBasicMaterial[]>([]);
  const initialState = getDoodleWarningState(obstacle.y, obstacle.radius);
  const segments = useMemo(
    () => Array.from({ length: initialState.dashCount }, (_, index) => index),
    [initialState.dashCount]
  );

  useFrame(() => {
    const state = getDoodleWarningState(obstacle.y, obstacle.radius);
    if (groupRef.current) {
      groupRef.current.visible = state.opacity > 0;
      groupRef.current.position.set(obstacle.x, 0.04, obstacle.z);
      groupRef.current.scale.set(state.scale, state.scale, 1);
    }

    materialRefs.current.forEach((material) => {
      material.opacity = state.opacity;
    });
  });

  return (
    <group
      ref={groupRef}
      visible={initialState.opacity > 0}
      position={[obstacle.x, 0.04, obstacle.z]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[initialState.scale, initialState.scale, 1]}
    >
      {segments.map((index) => {
        const angle = (index / initialState.dashCount) * Math.PI * 2;

        return (
          <mesh
            key={index}
            position={[Math.cos(angle), Math.sin(angle), 0]}
            rotation={[0, 0, angle + Math.PI / 2]}
          >
            <boxGeometry args={[0.34, 0.055, 0.015]} />
            <meshBasicMaterial
              ref={(material) => {
                if (material) {
                  materialRefs.current[index] = material;
                }
              }}
              color="#ef4444"
              transparent
              opacity={initialState.opacity}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}
