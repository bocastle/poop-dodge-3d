import type { ArenaBounds } from "../types";

type PaperArenaProps = {
  bounds: ArenaBounds;
};

const ink = "#1f2937";
const paper = "#fffdf4";
const grid = "#dbeafe";
const shadow = "#d6d3d1";

export function PaperArena({ bounds }: PaperArenaProps) {
  const width = bounds.width + 1.4;
  const depth = bounds.depth + 1.4;

  return (
    <group>
      <mesh position={[0.16, -0.08, 0.16]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial color={shadow} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
        <planeGeometry args={[width, depth, 1, 1]} />
        <meshStandardMaterial color={paper} roughness={0.96} metalness={0} />
      </mesh>

      <GridLines width={width} depth={depth} />
      <Border width={width} depth={depth} />
    </group>
  );
}

function GridLines({ depth, width }: { depth: number; width: number }) {
  const lines = [];

  for (let x = -Math.floor(width / 2); x <= Math.floor(width / 2); x += 1) {
    lines.push(
      <mesh key={`x-${x}`} position={[x, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.018, depth]} />
        <meshBasicMaterial color={grid} transparent opacity={0.55} />
      </mesh>
    );
  }

  for (let z = -Math.floor(depth / 2); z <= Math.floor(depth / 2); z += 1) {
    lines.push(
      <mesh
        key={`z-${z}`}
        position={[0, 0.003, z]}
        rotation={[-Math.PI / 2, 0, Math.PI / 2]}
      >
        <planeGeometry args={[0.018, width]} />
        <meshBasicMaterial color={grid} transparent opacity={0.55} />
      </mesh>
    );
  }

  return <>{lines}</>;
}

function Border({ depth, width }: { depth: number; width: number }) {
  return (
    <group position={[0, 0.06, 0]}>
      <mesh position={[0, 0, -depth / 2]}>
        <boxGeometry args={[width, 0.12, 0.12]} />
        <meshBasicMaterial color={ink} />
      </mesh>
      <mesh position={[0, 0, depth / 2]}>
        <boxGeometry args={[width, 0.12, 0.12]} />
        <meshBasicMaterial color={ink} />
      </mesh>
      <mesh position={[-width / 2, 0, 0]}>
        <boxGeometry args={[0.12, 0.12, depth]} />
        <meshBasicMaterial color={ink} />
      </mesh>
      <mesh position={[width / 2, 0, 0]}>
        <boxGeometry args={[0.12, 0.12, depth]} />
        <meshBasicMaterial color={ink} />
      </mesh>
    </group>
  );
}
