import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'

export function VehicleModel({ roll = 0, pitch = 0, yaw = 0 }) {
  const group = useRef()
  
  // Convert degrees to radians
  const rollRad = roll * (Math.PI / 180)
  const pitchRad = pitch * (Math.PI / 180)
  const yawRad = yaw * (Math.PI / 180)

  // Update rotation every frame
  useFrame(() => {
    if (group.current) {
      group.current.rotation.set(pitchRad, yawRad, rollRad)
    }
  })

  return (
    <group ref={group}>
      {/* Main body */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 2, 32]} />
        <meshPhongMaterial color="#3a86ff" transparent opacity={0.9} shininess={100} />
      </mesh>
      
      {/* Nose cone */}
      <mesh position={[0, 0, -1.4]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.5, 0.8, 32]} />
        <meshPhongMaterial color="#1a659e" />
      </mesh>
      
      {/* Fins */}
      <mesh position={[0, 0, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.1, 0.8, 0.5]} />
        <meshPhongMaterial color="#ff6b35" />
      </mesh>
      
      <mesh position={[0, 0.5, 1]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.8, 0.1, 0.3]} />
        <meshPhongMaterial color="#ff6b35" />
      </mesh>
      
      <mesh position={[0, -0.5, 1]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.8, 0.1, 0.3]} />
        <meshPhongMaterial color="#ff6b35" />
      </mesh>
      
      {/* Propeller */}
      <mesh position={[0, 0, 1.6]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.1, 8]} />
        <meshPhongMaterial color="#4a4a4a" />
      </mesh>
      
      {/* Coordinate axes */}
      <axesHelper args={[2]} />
    </group>
  )
}