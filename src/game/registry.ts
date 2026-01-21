import type { BuildingType } from '../state/types';

export interface BuildingDef {
    type: BuildingType;
    icon: string;
    label: string;
    description: string;
    cost: {
        gold: number;
        elixir: number;
    };
    production?: {
        gold: number;
        elixir: number;
    };
}

export const BUILDING_REGISTRY: Record<BuildingType, BuildingDef> = {
    townhall: {
        type: 'townhall',
        icon: '🏛️',
        label: 'Town Hall',
        description: 'The heart of your village.',
        cost: { gold: 0, elixir: 0 },
    },
    workshop: {
        type: 'workshop',
        icon: '⚙️',
        label: 'Workshop',
        description: 'Where the magic happens.',
        cost: { gold: 100, elixir: 50 },
    },
    collector: {
        type: 'collector',
        icon: '💰',
        label: 'Gold Collector',
        description: 'Generates gold over time.',
        cost: { gold: 50, elixir: 0 },
        production: { gold: 2, elixir: 0 },
    },
    watchtower: {
        type: 'watchtower',
        icon: '👁️',
        label: 'Watch Tower',
        description: 'Keeps an eye on the horizons.',
        cost: { gold: 75, elixir: 25 },
    },
    barracks: {
        type: 'barracks',
        icon: '⚔️',
        label: 'Barracks',
        description: 'Train your village defenders.',
        cost: { gold: 150, elixir: 75 },
    },
};

export const getBuildingDef = (type: BuildingType) => BUILDING_REGISTRY[type];
