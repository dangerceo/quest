import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { Ground, Sky } from './Environment';
import { Building, BuildingGhost } from '../buildings/Building';
import { Villager } from '../villagers/Villager';
import { useGameStore } from '../state/gameStore';

export function Village() {
    const buildings = useGameStore((s) => s.buildings);
    const villagers = useGameStore((s) => s.villagers);
    const isPlacingBuilding = useGameStore((s) => s.isPlacingBuilding);
    const addBuilding = useGameStore((s) => s.addBuilding);
    const selectBuilding = useGameStore((s) => s.selectBuilding);
    const tick = useGameStore((s) => s.tick);

    const [ghostPosition, setGhostPosition] = useState<[number, number, number]>([0, 0, 0]);
    const planeRef = useRef<THREE.Mesh>(null);

    // Game tick
    useFrame((_, delta) => {
        tick(delta);
    });

    // Handle ground click for building placement
    const handleGroundClick = (e: { stopPropagation: () => void; point: THREE.Vector3 }) => {
        if (isPlacingBuilding) {
            e.stopPropagation();
            const point = e.point;
            // Snap to grid
            const snappedX = Math.round(point.x / 2) * 2;
            const snappedZ = Math.round(point.z / 2) * 2;
            addBuilding(isPlacingBuilding, [snappedX, 0, snappedZ]);
        } else {
            // Clicked on ground, deselect building
            selectBuilding(null);
        }
    };

    // Handle ground hover for placement preview
    const handleGroundMove = (e: { point: THREE.Vector3 }) => {
        if (isPlacingBuilding) {
            const point = e.point;
            const snappedX = Math.round(point.x / 2) * 2;
            const snappedZ = Math.round(point.z / 2) * 2;
            setGhostPosition([snappedX, 0, snappedZ]);
        }
    };

    return (
        <>
            {/* Camera */}
            <PerspectiveCamera makeDefault position={[15, 15, 15]} fov={50} />
            <OrbitControls
                makeDefault
                enablePan
                enableZoom
                enableRotate
                maxPolarAngle={Math.PI / 2.5}
                minPolarAngle={Math.PI / 6}
                maxDistance={40}
                minDistance={8}
                target={[0, 0, 0]}
            />

            {/* Environment */}
            <Sky />
            <Ground />

            {/* Invisible interaction plane */}
            <mesh
                ref={planeRef}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, 0, 0]}
                onClick={handleGroundClick}
                onPointerMove={handleGroundMove}
                visible={false}
            >
                <planeGeometry args={[60, 60]} />
                <meshBasicMaterial />
            </mesh>

            {/* Buildings */}
            {buildings.map((building) => (
                <Building key={building.id} building={building} />
            ))}

            {/* Building placement ghost */}
            {isPlacingBuilding && (
                <BuildingGhost type={isPlacingBuilding} position={ghostPosition} />
            )}

            {/* Villagers */}
            {villagers.map((villager) => (
                <Villager key={villager.id} villager={villager} />
            ))}

            {/* Decorative elements */}
            <Trees />
            <Rocks />
        </>
    );
}

function Trees() {
    const trees = [
        { position: [-8, 0, -6] as [number, number, number], scale: 1.2 },
        { position: [10, 0, -8] as [number, number, number], scale: 1 },
        { position: [-12, 0, 4] as [number, number, number], scale: 0.9 },
        { position: [8, 0, 10] as [number, number, number], scale: 1.1 },
        { position: [-6, 0, 12] as [number, number, number], scale: 0.8 },
        { position: [14, 0, 2] as [number, number, number], scale: 1.3 },
    ];

    return (
        <>
            {trees.map((tree, i) => (
                <group key={i} position={tree.position} scale={tree.scale}>
                    {/* Trunk */}
                    <mesh position={[0, 0.6, 0]} castShadow>
                        <cylinderGeometry args={[0.15, 0.2, 1.2, 8]} />
                        <meshStandardMaterial color="#8b4513" roughness={0.9} />
                    </mesh>
                    {/* Foliage layers */}
                    <mesh position={[0, 1.5, 0]} castShadow>
                        <coneGeometry args={[0.8, 1.2, 8]} />
                        <meshStandardMaterial color="#2d5a27" roughness={0.8} />
                    </mesh>
                    <mesh position={[0, 2.2, 0]} castShadow>
                        <coneGeometry args={[0.6, 1, 8]} />
                        <meshStandardMaterial color="#3a7033" roughness={0.8} />
                    </mesh>
                    <mesh position={[0, 2.7, 0]} castShadow>
                        <coneGeometry args={[0.4, 0.8, 8]} />
                        <meshStandardMaterial color="#4a9043" roughness={0.8} />
                    </mesh>
                </group>
            ))}
        </>
    );
}

function Rocks() {
    const rocks = [
        { position: [-4, 0, -10] as [number, number, number], scale: 0.6 },
        { position: [12, 0, -4] as [number, number, number], scale: 0.4 },
        { position: [-10, 0, 8] as [number, number, number], scale: 0.5 },
        { position: [6, 0, -12] as [number, number, number], scale: 0.7 },
    ];

    return (
        <>
            {rocks.map((rock, i) => (
                <mesh key={i} position={rock.position} scale={rock.scale} castShadow>
                    <dodecahedronGeometry args={[1, 0]} />
                    <meshStandardMaterial color="#888888" roughness={0.9} flatShading />
                </mesh>
            ))}
        </>
    );
}
