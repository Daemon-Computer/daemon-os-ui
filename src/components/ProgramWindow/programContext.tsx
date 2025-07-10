import type { JSXElement, Component } from 'solid-js';
import { createContext, useContext } from 'solid-js';
import { createStore, produce } from 'solid-js/store';

const _programContextModuleId = Math.random().toString(36).substring(7);
// console.log(`programContext.tsx module evaluating (ID: ${programContextModuleId})`); // Keep for debugging if needed

export const TASKBAR_HEIGHT_PX = 46;

interface RunningProgram {
  component: Component;
  id: string;
  label: string;
  iconPath: string;
  isMinimized: boolean;
  zIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  minimizeTargetX: number;
  minimizeTargetY: number;
}

interface ProgramRegistry {
  registerProgram: (
    program: Omit<
      RunningProgram,
      | 'id'
      | 'zIndex'
      | 'x'
      | 'y'
      | 'minimizeTargetX'
      | 'minimizeTargetY'
      | 'isMinimized'
      | 'width'
      | 'height'
    > & { initialWidth: number; initialHeight: number },
  ) => string;
  unregisterProgram: (id: string) => void;
  minimizeProgram: (id: string) => void;
  restoreProgram: (id: string) => void;
  bringToFront: (id: string) => void;
  updateProgramPosition: (id: string, x: number, y: number) => void;
  updateMinimizeTarget: (id: string, x: number, y: number) => void;
  activePrograms: RunningProgram[];
  isRunning: (label: string) => boolean;
}

export const programContext = createContext<ProgramRegistry>();
// console.log(`ProgramContext object created (ID: ${programContextModuleId}):`, ProgramContext);

export function ProgramProvider(props: { children: JSXElement }) {
  const [programs, setPrograms] = createStore<RunningProgram[]>([]);
  // console.log(`ProgramProvider rendering (ID: ${programContextModuleId}), providing context:`, ProgramContext);

  const isRunning = (label: string) => programs.some((p) => p.label === label);

  const normalizeZIndices = (currentPrograms: RunningProgram[]) => {
    const nonMinimized = currentPrograms
      .filter((p) => !p.isMinimized)
      .sort((a, b) => a.zIndex - b.zIndex);

    let currentZ = 1;
    nonMinimized.forEach((p) => {
      const programInStore = currentPrograms.find((sp) => sp.id === p.id);
      if (programInStore) {
        programInStore.zIndex = currentZ++;
      }
    });
    currentPrograms
      .filter((p) => p.isMinimized)
      .forEach((p) => {
        p.zIndex = 0;
      });
    return currentZ - 1;
  };

  const registerProgram = (
    programDetails: Omit<
      RunningProgram,
      | 'id'
      | 'zIndex'
      | 'x'
      | 'y'
      | 'minimizeTargetX'
      | 'minimizeTargetY'
      | 'isMinimized'
      | 'width'
      | 'height'
    > & { initialWidth: number; initialHeight: number },
  ) => {
    const id = crypto.randomUUID();

    const initialX = Math.max(0, (window.innerWidth - programDetails.initialWidth) / 2);
    const initialY = Math.max(
      0,
      (window.innerHeight - TASKBAR_HEIGHT_PX - programDetails.initialHeight) / 2,
    );

    setPrograms(
      produce((currentPrograms) => {
        const maxExistingZ = normalizeZIndices(currentPrograms);

        const newProgram: RunningProgram = {
          ...programDetails,
          id,
          width: programDetails.initialWidth,
          height: programDetails.initialHeight,
          x: initialX,
          y: initialY,
          zIndex: maxExistingZ + 1,
          isMinimized: false,
          minimizeTargetX: 0,
          minimizeTargetY: window.innerHeight,
        };
        currentPrograms.push(newProgram);
        const programToElevate = currentPrograms.find((p) => p.id === id);
        if (programToElevate) {
          let highestZ = 0;
          currentPrograms.forEach((p) => {
            if (p.id !== id && !p.isMinimized) {
              highestZ = Math.max(highestZ, p.zIndex);
            }
          });
          programToElevate.zIndex = highestZ + 1;
        }
        normalizeZIndices(currentPrograms);
      }),
    );

    return id;
  };

  const unregisterProgram = (id: string) => {
    setPrograms(
      produce((programs) => {
        const index = programs.findIndex((p) => p.id === id);
        if (index !== -1) {
          programs.splice(index, 1);
          normalizeZIndices(programs);
        }
      }),
    );
  };

  const minimizeProgram = (id: string) => {
    setPrograms(
      produce((programs) => {
        const program = programs.find((p) => p.id === id);
        if (program && !program.isMinimized) {
          program.isMinimized = true;
          normalizeZIndices(programs);
        }
      }),
    );
  };

  const restoreProgram = (id: string) => {
    setPrograms(
      produce((programs) => {
        const program = programs.find((p) => p.id === id);
        if (program) {
          if (program.isMinimized) {
            program.isMinimized = false;
          }
          const maxZ = programs
            .filter((p) => !p.isMinimized && p.id !== id) // Exclude self for finding max among OTHERS
            .reduce((max, p) => Math.max(max, p.zIndex), 0);
          program.zIndex = maxZ + 1;
          normalizeZIndices(programs);
        }
      }),
    );
  };

  const bringToFront = (id: string) => {
    setPrograms(
      produce((programs) => {
        const program = programs.find((p) => p.id === id);
        if (program && !program.isMinimized) {
          const maxZ = programs
            .filter((p) => !p.isMinimized && p.id !== id)
            .reduce((max, p) => Math.max(max, p.zIndex), 0);

          if (program.zIndex <= maxZ) {
            program.zIndex = maxZ + 1;
            normalizeZIndices(programs);
          }
        }
      }),
    );
  };

  const updateProgramPosition = (id: string, x: number, y: number) => {
    setPrograms(
      produce((programs) => {
        const program = programs.find((p) => p.id === id);
        if (program) {
          program.x = x;
          program.y = y;
        }
      }),
    );
  };

  const updateMinimizeTarget = (id: string, x: number, y: number) => {
    setPrograms(
      produce((programs) => {
        const program = programs.find((p) => p.id === id);
        if (program) {
          program.minimizeTargetX = x;
          program.minimizeTargetY = y;
        }
      }),
    );
  };

  const value: ProgramRegistry = {
    registerProgram,
    unregisterProgram,
    minimizeProgram,
    restoreProgram,
    bringToFront,
    updateProgramPosition,
    updateMinimizeTarget,
    activePrograms: programs,
    isRunning,
  };

  return <programContext.Provider value={value}>{props.children}</programContext.Provider>;
}

export const usePrograms = () => {
  // console.log(`usePrograms called (ID: ${programContextModuleId}), trying to access context:`, ProgramContext); // Keep for debugging
  const context = useContext(programContext);
  if (!context) {
    // console.error(`usePrograms (ID: ${programContextModuleId}): useContext(ProgramContext) returned null/undefined.`); // Keep for debugging
    throw new Error('usePrograms must be used within a ProgramProvider');
  }
  return context;
};
