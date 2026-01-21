import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../state/gameStore';
import type { Villager as VillagerType } from '../state/types';

interface VillagerProps {
    villager: VillagerType;
}

// Villager color palette for variety
const VILLAGER_COLORS = [
    { body: '#f5d6ba', clothes: '#ff6b6b' },
    { body: '#e8c4a0', clothes: '#4ecdc4' },
    { body: '#d4a76a', clothes: '#ffd93d' },
    { body: '#c9a86c', clothes: '#6bcb77' },
    { body: '#f0d9b5', clothes: '#9b59b6' },
];

export function Villager({ villager }: VillagerProps) {
    const groupRef = useRef<THREE.Group>(null);
    const bodyRef = useRef<THREE.Mesh>(null);
    const tasks = useGameStore((s) => s.tasks);

    // Deterministic color based on villager id
    const colorIndex = useMemo(() => {
        let hash = 0;
        for (let i = 0; i < villager.id.length; i++) {
            hash = ((hash << 5) - hash) + villager.id.charCodeAt(i);
        }
        return Math.abs(hash) % VILLAGER_COLORS.length;
    }, [villager.id]);

    const colors = VILLAGER_COLORS[colorIndex];

    // Animation state
    const walkPhase = useRef(0);
    const celebratePhase = useRef(0);

    useFrame((_, delta) => {
        if (!groupRef.current) return;

        const current = new THREE.Vector3(...villager.position);
        const target = villager.targetPosition
            ? new THREE.Vector3(...villager.targetPosition)
            : null;

        // Movement
        if (target && villager.state === 'walking') {
            const direction = target.clone().sub(current);
            const distance = direction.length();

            if (distance > 0.1) {
                direction.normalize();

                // Move towards target
                const newPos = current.clone().add(direction.multiplyScalar(delta * 2));
                groupRef.current.position.copy(newPos);

                // Face direction of movement
                groupRef.current.rotation.y = Math.atan2(direction.x, direction.z);

                // Walking bob animation
                walkPhase.current += delta * 10;
                groupRef.current.position.y = Math.abs(Math.sin(walkPhase.current)) * 0.1;
            } else {
                // Arrived at destination
                groupRef.current.position.set(target.x, 0, target.z);
            }
        } else if (villager.state === 'celebrating') {
            // Celebration bounce
            celebratePhase.current += delta * 8;
            groupRef.current.position.y = Math.abs(Math.sin(celebratePhase.current)) * 0.3;
            groupRef.current.rotation.y += delta * 5;
        } else {
            // Idle subtle movement
            walkPhase.current += delta * 2;
            groupRef.current.position.y = Math.sin(walkPhase.current) * 0.02;
        }

        // Working animation
        if (villager.state === 'working' && bodyRef.current) {
            bodyRef.current.rotation.z = Math.sin(Date.now() * 0.01) * 0.1;
        }
    });

    // Get task info for this villager
    const assignedTask = tasks.find((t) => t.id === villager.assignedTaskId);

    return (
        <group ref={groupRef} position={villager.position}>
            {/* Body (pill shape) */}
            <mesh ref={bodyRef} position={[0, 0.35, 0]} castShadow>
                <capsuleGeometry args={[0.15, 0.25, 8, 16]} />
                <meshStandardMaterial color={colors.clothes} roughness={0.7} />
            </mesh>

            {/* Head */}
            <mesh position={[0, 0.7, 0]} castShadow>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshStandardMaterial color={colors.body} roughness={0.8} />
            </mesh>

            {/* Eyes */}
            <mesh position={[0.05, 0.72, 0.12]}>
                <sphereGeometry args={[0.03, 8, 8]} />
                <meshBasicMaterial color="#333333" />
            </mesh>
            <mesh position={[-0.05, 0.72, 0.12]}>
                <sphereGeometry args={[0.03, 8, 8]} />
                <meshBasicMaterial color="#333333" />
            </mesh>

            {/* Smile when celebrating */}
            {villager.state === 'celebrating' && (
                <mesh position={[0, 0.65, 0.13]} rotation={[0, 0, Math.PI]}>
                    <torusGeometry args={[0.05, 0.015, 8, 16, Math.PI]} />
                    <meshBasicMaterial color="#333333" />
                </mesh>
            )}

            {/* Arms */}
            <mesh position={[0.2, 0.35, 0]} rotation={[0, 0, villager.state === 'working' ? -0.5 : 0]}>
                <capsuleGeometry args={[0.04, 0.15, 4, 8]} />
                <meshStandardMaterial color={colors.body} roughness={0.8} />
            </mesh>
            <mesh position={[-0.2, 0.35, 0]} rotation={[0, 0, villager.state === 'working' ? 0.5 : 0]}>
                <capsuleGeometry args={[0.04, 0.15, 4, 8]} />
                <meshStandardMaterial color={colors.body} roughness={0.8} />
            </mesh>

            {/* Legs */}
            <mesh position={[0.08, 0.1, 0]}>
                <capsuleGeometry args={[0.05, 0.1, 4, 8]} />
                <meshStandardMaterial color="#555555" roughness={0.9} />
            </mesh>
            <mesh position={[-0.08, 0.1, 0]}>
                <capsuleGeometry args={[0.05, 0.1, 4, 8]} />
                <meshStandardMaterial color="#555555" roughness={0.9} />
            </mesh>

            {/* Name tag */}
            <Text
                position={[0, 1, 0]}
                fontSize={0.15}
                color="white"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.02}
                outlineColor="#000000"
            >
                {villager.name}
            </Text>

            {/* Task indicator */}
            {assignedTask && (
                <group position={[0, 1.2, 0]}>
                    <mesh>
                        <planeGeometry args={[0.6, 0.15]} />
                        <meshBasicMaterial color="#333333" transparent opacity={0.7} />
                    </mesh>
                    {/* Progress bar background */}
                    <mesh position={[0, 0, 0.001]}>
                        <planeGeometry args={[0.55, 0.08]} />
                        <meshBasicMaterial color="#555555" />
                    </mesh>
                    {/* Progress bar fill */}
                    <mesh position={[(assignedTask.progress / 100 - 1) * 0.275, 0, 0.002]}>
                        <planeGeometry args={[0.55 * (assignedTask.progress / 100), 0.08]} />
                        <meshBasicMaterial color="#4ecdc4" />
                    </mesh>
                </group>
            )}

            {/* Celebration particles */}
            {villager.state === 'celebrating' && <CelebrationParticles />}

            {/* Shadow */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                <circleGeometry args={[0.2, 16]} />
                <meshBasicMaterial color="#000000" transparent opacity={0.2} />
            </mesh>
        </group>
    );
}

function CelebrationParticles() {
    const particlesRef = useRef<THREE.Points>(null);
    const velocities = useRef<Float32Array>(new Float32Array(0));

    const particles = useMemo(() => {
        const positions = new Float32Array(20 * 3);
        const colors = new Float32Array(20 * 3);
        velocities.current = new Float32Array(20 * 3);

        const colorOptions = [
            [1, 0.84, 0], // Gold
            [1, 0.5, 0.5], // Pink
            [0.5, 1, 0.5], // Green
            [0.5, 0.8, 1], // Blue
        ];

        for (let i = 0; i < 20; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 0.5;
            positions[i * 3 + 1] = 0.8 + Math.random() * 0.5;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;

            velocities.current[i * 3] = (Math.random() - 0.5) * 2;
            velocities.current[i * 3 + 1] = 2 + Math.random() * 2;
            velocities.current[i * 3 + 2] = (Math.random() - 0.5) * 2;

            const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];
            colors[i * 3] = color[0];
            colors[i * 3 + 1] = color[1];
            colors[i * 3 + 2] = color[2];
        }
        return { positions, colors };
    }, []);

    useFrame((_, delta) => {
        if (!particlesRef.current || !velocities.current) return;
        const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;

        for (let i = 0; i < 20; i++) {
            positions[i * 3] += velocities.current[i * 3] * delta;
            positions[i * 3 + 1] += velocities.current[i * 3 + 1] * delta;
            positions[i * 3 + 2] += velocities.current[i * 3 + 2] * delta;

            // Gravity
            velocities.current[i * 3 + 1] -= 5 * delta;

            // Reset if fallen
            if (positions[i * 3 + 1] < 0) {
                positions[i * 3] = (Math.random() - 0.5) * 0.5;
                positions[i * 3 + 1] = 0.8;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
                velocities.current[i * 3] = (Math.random() - 0.5) * 2;
                velocities.current[i * 3 + 1] = 2 + Math.random() * 2;
                velocities.current[i * 3 + 2] = (Math.random() - 0.5) * 2;
            }
        }
        particlesRef.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
        <points ref={particlesRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={20}
                    array={particles.positions}
                    itemSize={3}
                    args={[particles.positions, 3]}
                />
                <bufferAttribute
                    attach="attributes-color"
                    count={20}
                    array={particles.colors}
                    itemSize={3}
                    args={[particles.colors, 3]}
                />
            </bufferGeometry>
            <pointsMaterial size={0.08} vertexColors transparent opacity={0.9} />
        </points>
    );
}
