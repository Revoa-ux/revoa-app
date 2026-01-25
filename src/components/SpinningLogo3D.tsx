import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface SpinningLogo3DProps {
  size?: number;
}

export const SpinningLogo3D: React.FC<SpinningLogo3DProps> = ({ size = 120 }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;
    const container = containerRef.current;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

    renderer.setClearColor(0x000000, 0);
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(10, 10, 20);
    scene.add(pointLight);

    let mesh: THREE.Mesh | null = null;
    let animationId: number;

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      'https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Revoa%203D%20Glass%20Logo%20V1.png',
      (texture) => {
        if (!mounted) return;

        const geometry = new THREE.BoxGeometry(3, 3, 0.1);
        const material = new THREE.MeshPhysicalMaterial({
          map: texture,
          transparent: true,
          roughness: 0.1,
          metalness: 0.5,
          clearcoat: 1.0,
          clearcoatRoughness: 0.05,
        });

        mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        mesh.rotation.y = Math.PI;
        camera.position.z = 8;

        const animate = () => {
          if (!mounted || !mesh) return;
          animationId = requestAnimationFrame(animate);
          mesh.rotation.x += 0.01;
          renderer.render(scene, camera);
        };

        animate();
      }
    );

    return () => {
      mounted = false;
      cancelAnimationFrame(animationId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [size]);

  return (
    <div
      ref={containerRef}
      style={{ width: size, height: size }}
      className="flex items-center justify-center"
    />
  );
};
