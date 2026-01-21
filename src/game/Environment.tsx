import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../state/gameStore';

export function Ground() {
    return (
        <group>
            {/* Main grass plane */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <circleGeometry args={[30, 64]} />
                <meshStandardMaterial
                    color="#5aa854"
                    roughness={0.9}
                    metalness={0}
                />
            </mesh>

            {/* Darker edge ring for depth */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
                <ringGeometry args={[28, 35, 64]} />
                <meshStandardMaterial
                    color="#3d7a3a"
                    roughness={1}
                    metalness={0}
                />
            </mesh>

            {/* Scattered decorative elements */}
            <GrassPatches />
        </group>
    );
}

function GrassPatches() {
    const patches = useMemo(() => {
        const items: { position: [number, number, number]; scale: number; color: string }[] = [];
        for (let i = 0; i < 50; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 5 + Math.random() * 20;
            items.push({
                position: [
                    Math.cos(angle) * radius,
                    0,
                    Math.sin(angle) * radius,
                ],
                scale: 0.3 + Math.random() * 0.4,
                color: Math.random() > 0.5 ? '#4a9644' : '#6ab862',
            });
        }
        return items;
    }, []);

    return (
        <>
            {patches.map((patch, i) => (
                <mesh key={i} position={patch.position} rotation={[-Math.PI / 2, 0, Math.random() * Math.PI]} castShadow>
                    <circleGeometry args={[patch.scale, 6]} />
                    <meshStandardMaterial color={patch.color} roughness={1} />
                </mesh>
            ))}
        </>
    );
}

export function Sky() {
    const gameTime = useGameStore((s) => s.gameTime);
    const skyRef = useRef<THREE.Mesh>(null);

    // Calculate sky color based on time of day
    const skyColor = useMemo(() => {
        if (gameTime >= 6 && gameTime < 8) {
            // Sunrise
            return new THREE.Color('#ffb366').lerp(new THREE.Color('#87ceeb'), (gameTime - 6) / 2);
        } else if (gameTime >= 8 && gameTime < 17) {
            // Day
            return new THREE.Color('#87ceeb');
        } else if (gameTime >= 17 && gameTime < 19) {
            // Sunset
            return new THREE.Color('#87ceeb').lerp(new THREE.Color('#ff7e5f'), (gameTime - 17) / 2);
        } else if (gameTime >= 19 && gameTime < 21) {
            // Dusk
            return new THREE.Color('#ff7e5f').lerp(new THREE.Color('#1a1a3e'), (gameTime - 19) / 2);
        } else {
            // Night
            return new THREE.Color('#1a1a3e');
        }
    }, [gameTime]);

    const bottomColor = useMemo(() => {
        if (gameTime >= 19 || gameTime < 6) {
            return new THREE.Color('#0d0d20');
        }
        return new THREE.Color('#c9e8f5');
    }, [gameTime]);

    return (
        <>
            {/* Sky dome */}
            <mesh ref={skyRef} scale={[-1, 1, 1]}>
                <sphereGeometry args={[100, 32, 32]} />
                <shaderMaterial
                    side={THREE.BackSide}
                    uniforms={{
                        topColor: { value: skyColor },
                        bottomColor: { value: bottomColor },
                    }}
                    vertexShader={`
            varying vec3 vWorldPosition;
            void main() {
              vec4 worldPosition = modelMatrix * vec4(position, 1.0);
              vWorldPosition = worldPosition.xyz;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
                    fragmentShader={`
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            varying vec3 vWorldPosition;
            void main() {
              float h = normalize(vWorldPosition).y;
              gl_FragColor = vec4(mix(bottomColor, topColor, max(h, 0.0)), 1.0);
            }
          `}
                />
            </mesh>

            {/* Sun/Moon */}
            <CelestialBody gameTime={gameTime} />

            {/* Ambient and directional lighting affected by time */}
            <TimeBasedLighting gameTime={gameTime} />
        </>
    );
}

function CelestialBody({ gameTime }: { gameTime: number }) {
    // Sun rises at 6, sets at 18
    const isSunVisible = gameTime >= 6 && gameTime < 18;
    const celestialAngle = isSunVisible
        ? ((gameTime - 6) / 12) * Math.PI // Sun arc
        : ((gameTime - 18 + 24) % 24) / 12 * Math.PI; // Moon arc

    const y = Math.sin(celestialAngle) * 40;
    const z = -Math.cos(celestialAngle) * 40;

    return (
        <mesh position={[0, y, z]}>
            <sphereGeometry args={[3, 16, 16]} />
            <meshBasicMaterial color={isSunVisible ? '#ffe484' : '#e8e8f0'} />
        </mesh>
    );
}

function TimeBasedLighting({ gameTime }: { gameTime: number }) {
    useThree();
    const lightRef = useRef<THREE.DirectionalLight>(null);

    useFrame(() => {
        if (!lightRef.current) return;

        // Calculate light intensity based on time
        let intensity = 1;
        if (gameTime >= 19 || gameTime < 6) {
            intensity = 0.2; // Night
        } else if (gameTime >= 17 && gameTime < 19) {
            intensity = 0.2 + (19 - gameTime) / 2 * 0.8; // Sunset fade
        } else if (gameTime >= 6 && gameTime < 8) {
            intensity = 0.2 + (gameTime - 6) / 2 * 0.8; // Sunrise fade
        }

        lightRef.current.intensity = intensity;

        // Update shadow camera to follow sun position
        const sunAngle = gameTime >= 6 && gameTime < 18
            ? ((gameTime - 6) / 12) * Math.PI
            : Math.PI / 2;

        lightRef.current.position.set(
            Math.cos(sunAngle + Math.PI / 4) * 20,
            Math.sin(sunAngle) * 20 + 10,
            -Math.cos(sunAngle) * 20
        );
    });

    return (
        <>
            <ambientLight intensity={0.4} />
            <directionalLight
                ref={lightRef}
                position={[10, 20, -10]}
                intensity={1}
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-far={50}
                shadow-camera-left={-20}
                shadow-camera-right={20}
                shadow-camera-top={20}
                shadow-camera-bottom={-20}
            />
            {/* Warm fill light */}
            <directionalLight
                position={[-5, 5, 5]}
                intensity={0.2}
                color="#ffeedd"
            />
        </>
    );
}
