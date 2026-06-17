import type { Position } from "../types";

type RemoteDoodlePlayerProps = {
  color: string;
  position: Position;
  eliminated: boolean;
};

export function RemoteDoodlePlayer({
  color,
  position,
  eliminated,
}: RemoteDoodlePlayerProps) {
  const opacity = eliminated ? 0.18 : 0.44;

  return (
    <group position={[position.x, position.y + 0.04, position.z]} scale={0.72}>
      <mesh>
        <sphereGeometry args={[0.22, 14, 14]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          wireframe
          depthWrite={false}
          roughness={0.82}
          metalness={0}
        />
      </mesh>
      <mesh position={[0, 0.32, 0]}>
        <sphereGeometry args={[0.14, 14, 14]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          wireframe
          depthWrite={false}
          roughness={0.82}
          metalness={0}
        />
      </mesh>
    </group>
  );
}
