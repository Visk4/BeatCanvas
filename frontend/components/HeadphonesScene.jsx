import React, { useRef, useEffect } from "react";
import * as THREE from "three";

export default function HeadphonesScene() {
    const mountRef = useRef(null);

    useEffect(() => {
        if (!mountRef.current) return;
        const currentMount = mountRef.current; // Capture mount point

        // Scene setup
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
            45,
            currentMount.clientWidth / currentMount.clientHeight,
            0.1,
            1000
        );

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.setClearColor(0x000000, 0);
        currentMount.appendChild(renderer.domElement);

        // Create headphones geometry (simplified)
        const headbandGeometry = new THREE.TorusGeometry(1.5, 0.1, 16, 100, Math.PI);
        const headbandMaterial = new THREE.MeshStandardMaterial({
            color: 0x3b82f6,
            metalness: 0.8,
            roughness: 0.2
        });
        const headband = new THREE.Mesh(headbandGeometry, headbandMaterial);
        headband.rotation.x = Math.PI / 2;

        // Left earcup
        const earcupGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.3, 32);
        const earcupMaterial = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            metalness: 0.6,
            roughness: 0.3
        });
        const leftEarcup = new THREE.Mesh(earcupGeometry, earcupMaterial);
        leftEarcup.position.set(-1.5, 0, 0);
        leftEarcup.rotation.z = Math.PI / 2;

        // Right earcup
        const rightEarcup = new THREE.Mesh(earcupGeometry, earcupMaterial);
        rightEarcup.position.set(1.5, 0, 0);
        rightEarcup.rotation.z = Math.PI / 2;

        // Add accent rings
        const ringGeometry = new THREE.TorusGeometry(0.65, 0.05, 16, 100);
        const ringMaterial = new THREE.MeshStandardMaterial({
            color: 0x3b82f6,
            emissive: 0x3b82f6,
            emissiveIntensity: 0.3
        });
        const leftRing = new THREE.Mesh(ringGeometry, ringMaterial);
        leftRing.position.set(-1.5, 0, 0);
        leftRing.rotation.y = Math.PI / 2;

        const rightRing = new THREE.Mesh(ringGeometry, ringMaterial);
        rightRing.position.set(1.5, 0, 0);
        rightRing.rotation.y = Math.PI / 2;

        // Group all parts
        const headphones = new THREE.Group();
        headphones.add(headband);
        headphones.add(leftEarcup);
        headphones.add(rightEarcup);
        headphones.add(leftRing);
        headphones.add(rightRing);
        headphones.rotation.y = Math.PI / 6;
        scene.add(headphones);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const pointLight1 = new THREE.PointLight(0x3b82f6, 1, 100);
        pointLight1.position.set(5, 5, 5);
        scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0x60a5fa, 0.5, 100);
        pointLight2.position.set(-5, -5, 5);
        scene.add(pointLight2);

        camera.position.z = 5;

        // Handle Resize
        const handleResize = () => {
            if (currentMount) {
                camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
            }
        };
        window.addEventListener('resize', handleResize);

        // Animation
        const animate = () => {
            requestAnimationFrame(animate);
            headphones.rotation.y += 0.005;
            renderer.render(scene, camera);
        };
        animate();

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            if (currentMount) {
                currentMount.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, []);

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div
                ref={mountRef}
                className="w-full h-64"
                style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, rgba(15,23,42,0) 70%)' }}
            />
        </div>
    );
}