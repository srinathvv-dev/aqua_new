"use client";

import React, { useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

function Vehicle({ roll, pitch, yaw }) {
  const ref = useRef();

  // Update rotation every frame
  useFrame(() => {
    if (ref.current) {
      // Convert degrees to radians
      const rollRad = THREE.MathUtils.degToRad(roll || 0);
      const pitchRad = THREE.MathUtils.degToRad(pitch || 0);
      const yawRad = THREE.MathUtils.degToRad(yaw || 0);

      // Apply rotations in ZYX order (Yaw, Pitch, Roll)
      ref.current.rotation.set(pitchRad, yawRad, rollRad, "ZYX");
    }
  });

  return (
    <mesh ref={ref}>
      <boxGeometry args={[2, 1, 4]} />
      <meshStandardMaterial color="orange" wireframe={false} />
    </mesh>
  );
}

export default function VehicleOrientation({ roll, pitch, yaw }) {
  return (
    <div style={{ height: "400px", width: "100%" }}>
      <Canvas camera={{ position: [10, 6, 10], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 10, 7]} intensity={1} />
        <Vehicle roll={roll} pitch={pitch} yaw={yaw} />
        <OrbitControls />
        <gridHelper args={[20, 20]} />
        <axesHelper args={[5]} />
      </Canvas>
    </div>
  );
}
