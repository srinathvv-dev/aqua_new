import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeScene({ roll = 0, pitch = 0, yaw = 0 }) {
  const mountRef = useRef(null);

  useEffect(() => {
    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111113);
    
    // Camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Vehicle model (simplified submarine/ROV)
    const vehicleGroup = new THREE.Group();
    
    // Main body (cylinder)
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 32);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x3a86ff,
      transparent: true,
      opacity: 0.9,
      shininess: 100
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2; // Rotate to horizontal position
    vehicleGroup.add(body);
    
    // Nose cone
    const noseGeometry = new THREE.ConeGeometry(0.5, 0.8, 32);
    const noseMaterial = new THREE.MeshPhongMaterial({ color: 0x1a659e });
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.position.z = -1.4;
    nose.rotation.x = Math.PI / 2;
    vehicleGroup.add(nose);
    
    // Tail fins
    const finMaterial = new THREE.MeshPhongMaterial({ color: 0xff6b35 });
    
    // Vertical fin
    const vFinGeometry = new THREE.BoxGeometry(0.1, 0.8, 0.5);
    const vFin = new THREE.Mesh(vFinGeometry, finMaterial);
    vFin.position.set(0, 0, 1.2);
    vFin.rotation.x = Math.PI / 2;
    vehicleGroup.add(vFin);
    
    // Horizontal fins (4)
    const hFinGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.3);
    
    const hFin1 = new THREE.Mesh(hFinGeometry, finMaterial);
    hFin1.position.set(0, 0.5, 1);
    hFin1.rotation.x = Math.PI / 2;
    vehicleGroup.add(hFin1);
    
    const hFin2 = new THREE.Mesh(hFinGeometry, finMaterial);
    hFin2.position.set(0, -0.5, 1);
    hFin2.rotation.x = Math.PI / 2;
    vehicleGroup.add(hFin2);
    
    // Propeller
    const propellerGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 8);
    const propellerMaterial = new THREE.MeshPhongMaterial({ color: 0x4a4a4a });
    const propeller = new THREE.Mesh(propellerGeometry, propellerMaterial);
    propeller.position.set(0, 0, 1.6);
    propeller.rotation.x = Math.PI / 2;
    vehicleGroup.add(propeller);
    
    // Add coordinate axes for reference (X: red, Y: green, Z: blue)
    const axesHelper = new THREE.AxesHelper(2);
    vehicleGroup.add(axesHelper);
    
    scene.add(vehicleGroup);
    
    // Grid helper
    const gridHelper = new THREE.GridHelper(10, 10, 0x555555, 0x333333);
    scene.add(gridHelper);
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Convert degrees to radians for Three.js
      const rollRad = THREE.MathUtils.degToRad(roll);
      const pitchRad = THREE.MathUtils.degToRad(pitch);
      const yawRad = THREE.MathUtils.degToRad(yaw);
      
      // Apply rotations (order matters: yaw, pitch, roll)
      vehicleGroup.rotation.set(pitchRad, yawRad, rollRad);
      
      renderer.render(scene, camera);
    };
    
    animate();
    
    // Handle window resize
    const handleResize = () => {
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      mountRef.current.removeChild(renderer.domElement);
    };
  }, [roll, pitch, yaw]);

  return <div ref={mountRef} className="w-full h-full" />;
}