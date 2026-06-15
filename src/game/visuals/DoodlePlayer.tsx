import { useFrame } from "@react-three/fiber";
import { forwardRef, useMemo, useRef } from "react";
import { BackSide, Color } from "three";
import type { Group } from "three";
import type { GamePhase, InputVector } from "../types";
import {
  getDoodleOutlineScale,
  getDoodlePlayerFace,
  getDoodlePlayerMotion,
  type DoodlePlayerMood,
} from "./doodleStyle";

type DoodlePlayerProps = {
  input: InputVector;
  mood: DoodlePlayerMood;
  phase: GamePhase;
};

const ink = "#1f2937";
const paper = "#fffdf4";
const shadow = "#9ca3af";
const playerOutlineScale = getDoodleOutlineScale(1.05);

export const DoodlePlayer = forwardRef<Group, DoodlePlayerProps>(function DoodlePlayer(
  { input, mood, phase },
  ref
) {
  const bodyRef = useRef<Group>(null);
  const leftLegRef = useRef<Group>(null);
  const rightLegRef = useRef<Group>(null);
  const face = getDoodlePlayerFace(mood);
  const bodyColor = useMemo(() => new Color(face.bodyColor), [face.bodyColor]);
  const cheekColor = useMemo(() => new Color(face.cheekColor), [face.cheekColor]);

  useFrame((state) => {
    const motionInput = phase === "playing" ? input : { x: 0, z: 0 };
    const motion = getDoodlePlayerMotion(motionInput, state.clock.elapsedTime);
    const legOffset = motion.legPhase * 0.1;

    if (bodyRef.current) {
      bodyRef.current.position.y = motion.bobY;
      bodyRef.current.rotation.x = motion.rotationX;
      bodyRef.current.rotation.z = motion.rotationZ;
      bodyRef.current.scale.set(1, motion.scaleY, 1);
    }

    if (leftLegRef.current) {
      leftLegRef.current.position.z = 0.04 + legOffset;
      leftLegRef.current.rotation.z = 0.32 * motion.legPhase;
    }

    if (rightLegRef.current) {
      rightLegRef.current.position.z = -0.04 - legOffset;
      rightLegRef.current.rotation.z = -0.32 * motion.legPhase;
    }
  });

  return (
    <group ref={ref}>
      <mesh position={[0, -0.43, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.48, 32]} />
        <meshBasicMaterial
          color={shadow}
          transparent
          opacity={0.28}
          depthWrite={false}
        />
      </mesh>

      <group ref={bodyRef}>
        <mesh scale={[playerOutlineScale, playerOutlineScale, playerOutlineScale]}>
          <sphereGeometry args={[0.38, 24, 18]} />
          <meshBasicMaterial color={ink} side={BackSide} />
        </mesh>

        <mesh scale={[0.94, 1.06, 0.82]}>
          <sphereGeometry args={[0.38, 24, 18]} />
          <meshStandardMaterial color={bodyColor} roughness={0.78} metalness={0} />
        </mesh>

        <mesh position={[0, 0.08, 0.31]} scale={[1, 0.36, 0.12]}>
          <sphereGeometry args={[0.24, 16, 10]} />
          <meshBasicMaterial color={paper} />
        </mesh>

        <mesh position={[-0.1, 0.09, 0.4]} scale={[face.eyeScaleX, face.eyeScaleY, 1]}>
          <sphereGeometry args={[0.035, 12, 8]} />
          <meshBasicMaterial color={ink} />
        </mesh>
        <mesh position={[0.1, 0.09, 0.4]} scale={[face.eyeScaleX, face.eyeScaleY, 1]}>
          <sphereGeometry args={[0.035, 12, 8]} />
          <meshBasicMaterial color={ink} />
        </mesh>

        <mesh position={[-0.2, -0.03, 0.38]} scale={[1.08, 0.7, 0.18]}>
          <sphereGeometry args={[0.035, 10, 8]} />
          <meshBasicMaterial color={cheekColor} transparent opacity={0.7} />
        </mesh>
        <mesh position={[0.2, -0.03, 0.38]} scale={[1.08, 0.7, 0.18]}>
          <sphereGeometry args={[0.035, 10, 8]} />
          <meshBasicMaterial color={cheekColor} transparent opacity={0.7} />
        </mesh>

        {face.mouth === "open" ? (
          <mesh position={[0, -0.1, 0.405]} scale={[1, 0.65, 0.22]}>
            <sphereGeometry args={[0.085, 12, 8]} />
            <meshBasicMaterial color={ink} />
          </mesh>
        ) : (
          <mesh
            position={[0, -0.1, 0.4]}
            rotation={[0, 0, face.mouth === "frown" ? Math.PI : 0]}
            scale={[1, 0.22, 0.12]}
          >
            <torusGeometry args={[0.11, 0.018, 8, 16, Math.PI]} />
            <meshBasicMaterial color={ink} />
          </mesh>
        )}

        <DoodleLeg ref={leftLegRef} x={-0.14} z={0.04} />
        <DoodleLeg ref={rightLegRef} x={0.14} z={-0.04} />
      </group>
    </group>
  );
});

const DoodleLeg = forwardRef<Group, { x: number; z: number }>(function DoodleLeg(
  { x, z },
  ref
) {
  return (
    <group ref={ref} position={[x, -0.38, z]}>
      <mesh scale={[0.06, 0.2, 0.06]}>
        <capsuleGeometry args={[0.5, 0.45, 4, 8]} />
        <meshBasicMaterial color={ink} />
      </mesh>
    </group>
  );
});
