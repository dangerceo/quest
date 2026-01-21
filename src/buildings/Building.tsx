import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../state/gameStore';
import type { Building as BuildingType, BuildingType as BuildingTypeEnum } from '../state/types';

interface BuildingProps {
    building: BuildingType;
}

// Building dimensions and colors
const BUILDING_CONFIGS: Record<BuildingTypeEnum, {
    baseColor: string;
    roofColor: string;
    size: [number, number, number];
    roofHeight: number;
    icon: string;
}> = {
    townhall: {
        baseColor: '#e8d5b8',
        roofColor: '#8b4513',
        size: [2.5, 2, 2.5],
        roofHeight: 1.5,
        icon: '🏛️',
    },
    workshop: {
        baseColor: '#d4a76a',
        roofColor: '#654321',
        size: [2, 1.5, 2],
        roofHeight: 1.2,
        icon: '⚙️',
    },
    watchtower: {
        baseColor: '#a0a0a0',
        roofColor: '#555555',
        size: [1.2, 3, 1.2],
        roofHeight: 0.8,
        icon: '👁️',
    },
    collector: {
        baseColor: '#f0e68c',
        roofColor: '#daa520',
        size: [1.5, 1.2, 1.5],
        roofHeight: 0.6,
        icon: '💰',
    },
    barracks: {
        baseColor: '#cd5c5c',
        roofColor: '#8b0000',
        size: [2.2, 1.8, 2.2],
        roofHeight: 1,
        icon: '⚔️',
    },
};

export function Building({ building }: BuildingProps) {
    const selectBuilding = useGameStore((s) => s.selectBuilding);
    const selectedBuildingId = useGameStore((s) => s.selectedBuildingId);
    const isSelected = selectedBuildingId === building.id;

    const groupRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);

    const config = BUILDING_CONFIGS[building.type];
    const [width, height, depth] = config.size;

    // Bounce animation when selected
    useFrame((_, delta) => {
        if (!groupRef.current) return;

        const targetScale = hovered || isSelected ? 1.05 : 1;
        groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 10);

        // Construction wobble
        if (building.isConstructing) {
            groupRef.current.rotation.y = Math.sin(Date.now() * 0.005) * 0.02;
        } else {
            groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, delta * 5);
        }
    });

    const handleClick = (e: { stopPropagation: () => void }) => {
        e.stopPropagation();
        selectBuilding(building.id);
    };

    return (
        <group
            ref={groupRef}
            position={building.position}
            onClick={handleClick}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
        >
            {/* Base/walls */}
            <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[width, height, depth]} />
                <meshStandardMaterial
                    color={config.baseColor}
                    roughness={0.8}
                    metalness={0.1}
                />
            </mesh>

            {/* Roof */}
            <mesh position={[0, height + config.roofHeight / 2, 0]} castShadow>
                <coneGeometry args={[Math.max(width, depth) * 0.7, config.roofHeight, 4]} />
                <meshStandardMaterial
                    color={config.roofColor}
                    roughness={0.7}
                    metalness={0.2}
                />
            </mesh>

            {/* Door */}
            <mesh position={[0, 0.4, depth / 2 + 0.01]}>
                <planeGeometry args={[0.5, 0.8]} />
                <meshStandardMaterial color="#4a3728" roughness={0.9} />
            </mesh>

            {/* Windows */}
            {width > 1.5 && (
                <>
                    <mesh position={[width / 3, height * 0.6, depth / 2 + 0.01]}>
                        <planeGeometry args={[0.3, 0.3]} />
                        <meshBasicMaterial color="#87ceeb" />
                    </mesh>
                    <mesh position={[-width / 3, height * 0.6, depth / 2 + 0.01]}>
                        <planeGeometry args={[0.3, 0.3]} />
                        <meshBasicMaterial color="#87ceeb" />
                    </mesh>
                </>
            )}

            {/* Selection ring */}
            {isSelected && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                    <ringGeometry args={[Math.max(width, depth) * 0.7, Math.max(width, depth) * 0.8, 32]} />
                    <meshBasicMaterial color="#ffd700" transparent opacity={0.8} />
                </mesh>
            )}

            {/* Hover highlight */}
            {hovered && !isSelected && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                    <ringGeometry args={[Math.max(width, depth) * 0.7, Math.max(width, depth) * 0.75, 32]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
                </mesh>
            )}

            {/* Construction scaffold overlay */}
            {building.isConstructing && (
                <ConstructionOverlay
                    size={[width, height, depth]}
                    progress={building.constructionProgress}
                />
            )}

            {/* Level indicator */}
            {building.level > 1 && (
                <Text
                    position={[0, height + config.roofHeight + 0.5, 0]}
                    fontSize={0.3}
                    color="#ffd700"
                    anchorX="center"
                    anchorY="middle"
                >
                    ★{building.level}
                </Text>
            )}
        </group>
    );
}

function ConstructionOverlay({ size, progress }: { size: [number, number, number]; progress: number }) {
    const [width, height, depth] = size;
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame(() => {
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.01;
        }
    });

    return (
        <group>
            {/* Scaffold poles */}
            {[
                [width / 2 + 0.2, 0, depth / 2 + 0.2],
                [-width / 2 - 0.2, 0, depth / 2 + 0.2],
                [width / 2 + 0.2, 0, -depth / 2 - 0.2],
                [-width / 2 - 0.2, 0, -depth / 2 - 0.2],
            ].map((pos, i) => (
                <mesh key={i} position={pos as [number, number, number]} position-y={height / 2}>
                    <cylinderGeometry args={[0.05, 0.05, height * 1.2]} />
                    <meshStandardMaterial color="#8b4513" roughness={1} />
                </mesh>
            ))}

            {/* Progress indicator ring */}
            <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, height + 0.5, 0]}>
                <ringGeometry args={[0.3, 0.5, 32, 1, 0, (progress / 100) * Math.PI * 2]} />
                <meshBasicMaterial color="#00ff00" transparent opacity={0.8} />
            </mesh>

            {/* Construction dust particles */}
            <ConstructionParticles position={[0, height / 2, 0]} />
        </group>
    );
}

function ConstructionParticles({ position }: { position: [number, number, number] }) {
    const particlesRef = useRef<THREE.Points>(null);

    const particles = useMemo(() => {
        const positions = new Float32Array(30 * 3);
        for (let i = 0; i < 30; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 2;
            positions[i * 3 + 1] = Math.random() * 2;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
        }
        return positions;
    }, []);

    useFrame(() => {
        if (!particlesRef.current) return;
        const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < 30; i++) {
            positions[i * 3 + 1] += 0.02;
            if (positions[i * 3 + 1] > 3) {
                positions[i * 3 + 1] = 0;
            }
        }
        particlesRef.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
        <points ref={particlesRef} position={position}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={30}
                    array={particles}
                    itemSize={3}
                    args={[particles, 3]}
                />
            </bufferGeometry>
            <pointsMaterial size={0.1} color="#d4a76a" transparent opacity={0.6} />
        </points>
    );
}

// Building placement ghost
export function BuildingGhost({ type, position }: { type: BuildingTypeEnum; position: [number, number, number] }) {
    const config = BUILDING_CONFIGS[type];
    const [width, height, depth] = config.size;

    return (
        <group position={position}>
            <mesh position={[0, height / 2, 0]}>
                <boxGeometry args={[width, height, depth]} />
                <meshStandardMaterial
                    color={config.baseColor}
                    transparent
                    opacity={0.5}
                />
            </mesh>
            <mesh position={[0, height + config.roofHeight / 2, 0]}>
                <coneGeometry args={[Math.max(width, depth) * 0.7, config.roofHeight, 4]} />
                <meshStandardMaterial
                    color={config.roofColor}
                    transparent
                    opacity={0.5}
                />
            </mesh>
            {/* Placement indicator */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                <circleGeometry args={[Math.max(width, depth), 32]} />
                <meshBasicMaterial color="#00ff00" transparent opacity={0.3} />
            </mesh>
        </group>
    );
}
