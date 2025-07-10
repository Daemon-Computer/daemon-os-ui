import type { JSXElement } from 'solid-js';
import { createEffect, createSignal, onCleanup, onMount, Show } from 'solid-js';
import interact from 'interactjs';
import { usePrograms, TASKBAR_HEIGHT_PX } from './programContext';
import ArrowsPointingOut from '../Icons/ArrowsPointingOut';
import ArrowsPointingIn from '../Icons/ArrowsPointingIn';
import X from '../Icons/X';
import Minus from '../Icons/Minus';

interface ProgramWindowProps {
  label: string; // window title
  programId: string;
  children: JSXElement; // the content within the program window
  onClose?: () => void; // optional custom close handler
}

export default function ProgramWindow(props: ProgramWindowProps) {
  const {
    minimizeProgram,
    unregisterProgram,
    bringToFront,
    activePrograms,
    restoreProgram,
    updateProgramPosition,
  } = usePrograms();

  const getProgramState = () => activePrograms.find((p) => p.id === props.programId);
  const programState = () => getProgramState();

  // --- State Management ---
  // Position driven by context, local signal helps smooth drag updates
  const [position, setPosition] = createSignal({ x: 0, y: 0 });

  // Window state
  const [isDragging, setIsDragging] = createSignal(false);
  const [isMaximized, setIsMaximized] = createSignal(false);

  // Previous state for maximize/restore toggle
  const [previousState, setPreviousState] = createSignal({
    width: 0,
    height: 0,
    x: 0,
    y: 0,
  });

  let windowRef: HTMLDivElement | undefined;
  let interactable: Interact.Interactable | undefined;

  // Sync local position signal WITH context state initially and when context changes
  createEffect(() => {
    const state = programState();
    if (state && !isDragging()) {
      setPosition({ x: state.x, y: state.y });

      // Update previous state if it's the first load or position has changed externally
      if (
        previousState().width === 0 ||
        previousState().x !== state.x ||
        previousState().y !== state.y
      ) {
        setPreviousState({
          width: state.width,
          height: state.height,
          x: state.x,
          y: state.y,
        });
      }
    }

    if (state && previousState().width === 0) {
      setPreviousState((prev) => ({ ...prev, width: state.width, height: state.height }));
    }
  });

  // --- DOM Manipulation and Effects ---
  function setWindowRef(el: HTMLDivElement) {
    windowRef = el;
    applyStateToDOM();
  }

  function applyStateToDOM() {
    if (!windowRef) return;
    const state = programState();
    if (state) {
      const currentPos = position();
      windowRef.style.transform = `translate(${currentPos.x}px, ${currentPos.y}px) scale(${state.isMinimized ? 0.2 : 1})`;
      windowRef.style.zIndex = String(state.zIndex || 1);

      // Set width/height unless maximized (handled separately) or minimized (handled by scale)
      if (!isMaximized() && !state.isMinimized) {
        windowRef.style.width = `${state.width}px`;
        windowRef.style.height = `${state.height}px`;
      } else if (isMaximized()) {
        handleBrowserResize(); // Re-apply maximized dimensions
      }
      windowRef.classList.toggle('hidden', !!state.isMinimized);
      windowRef.classList.toggle('flex', !state.isMinimized);
    }
  }

  createEffect(() => {
    const _state = programState();
    const _pos = position();
    const isCurrentlyMaximized = isMaximized();

    void _state; // Preserved for future use
    void _pos; // Preserved for future use
    void isCurrentlyMaximized; // Preserved for future use

    applyStateToDOM();
  });

  function syncPositionFromDOM() {
    if (!windowRef) return { x: 0, y: 0 };
    const transform = windowRef.style.transform;
    const match = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
    if (match) {
      const x = parseFloat(match[1]);
      const y = parseFloat(match[2]);
      if (!isNaN(x) && !isNaN(y)) {
        if (position().x !== x || position().y !== y) {
          setPosition({ x, y });
        }
        return { x, y };
      }
    }
    const state = programState();
    return { x: state?.x ?? 0, y: state?.y ?? 0 };
  }

  // --- Window Actions ---
  function handleMinimize() {
    if (!windowRef || !props.programId) return;
    const state = programState();
    if (!state || state.isMinimized) return;

    if (isMaximized()) {
      handleMaximize();
    }

    const currentPos = position();
    setPreviousState({
      width: windowRef.offsetWidth,
      height: windowRef.offsetHeight,
      x: currentPos.x,
      y: currentPos.y,
    });

    // Animate towards taskbar button location stored in context
    windowRef.style.transition = 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out';
    windowRef.style.transform = `translate(${state.minimizeTargetX}px, ${state.minimizeTargetY}px) scale(0.1)`;
    windowRef.style.opacity = '0';

    setTimeout(() => {
      minimizeProgram(props.programId!);
      if (windowRef) {
        windowRef.style.transition = '';
        windowRef.style.opacity = '1';
        // DOM element is now hidden via classList toggle based on context state
      }
    }, 300);
  }

  function handleMaximize() {
    if (!windowRef) return;
    const state = programState();
    if (!state) return;

    windowRef.style.transition = 'all 0.2s ease-out';

    if (isMaximized()) {
      const prev = previousState();
      setPosition({ x: prev.x, y: prev.y });

      windowRef.style.width = `${prev.width}px`;
      windowRef.style.height = `${prev.height}px`;
      windowRef.style.transform = `translate(${prev.x}px, ${prev.y}px)`;

      setIsMaximized(false);

      // Update context immediately with restored position
      updateProgramPosition(props.programId, prev.x, prev.y);
    } else {
      // Save current state before maximizing
      const currentPos = position();
      setPreviousState({
        width: windowRef.offsetWidth,
        height: windowRef.offsetHeight,
        x: currentPos.x,
        y: currentPos.y,
      });

      setPosition({ x: 0, y: 0 });
      windowRef.style.transform = 'translate(0px, 0px)';
      handleBrowserResize();
      setIsMaximized(true);

      updateProgramPosition(props.programId, 0, 0);
    }

    setTimeout(() => {
      if (windowRef) windowRef.style.transition = '';
    }, 200);
  }

  function handleUnMinimize() {
    if (!windowRef || !props.programId) return;
    const state = programState();
    if (!state || !state.isMinimized) return;

    // Target position is the one stored in the context state
    const targetX = state.x;
    const targetY = state.y;

    // Make window visible slightly before animation starts for smoother transition
    windowRef.classList.remove('hidden');
    windowRef.classList.add('flex');
    windowRef.style.opacity = '0';

    // Force browser reflow to apply visibility change before transition
    void windowRef.offsetWidth;

    windowRef.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
    windowRef.style.transform = `translate(${targetX}px, ${targetY}px) scale(1)`;
    windowRef.style.opacity = '1';

    // Trigger global state update *after* animation starts, so context change doesn't interrupt it
    setTimeout(() => {
      restoreProgram(props.programId);
    }, 50);

    setTimeout(() => {
      if (windowRef) {
        windowRef.style.transition = '';
        // Position should already be correct via context update + effect
      }
    }, 350);
  }

  function handleClose() {
    if (props.programId) {
      if (props.onClose) {
        props.onClose();
      } else {
        unregisterProgram(props.programId);
      }
    }
  }

  // --- Browser Resize Handling ---
  function handleBrowserResize() {
    if (isMaximized() && windowRef) {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight - TASKBAR_HEIGHT_PX;
      windowRef.style.width = `${newWidth}px`;
      windowRef.style.height = `${newHeight}px`;

      // Ensure position stays at 0,0
      if (position().x !== 0 || position().y !== 0) {
        setPosition({ x: 0, y: 0 });
        windowRef.style.transform = 'translate(0px, 0px)';
        updateProgramPosition(props.programId, 0, 0);
      }
    }

    // Update boundaries for interactjs
    setupDragging();
  }

  // --- Dragging Setup ---
  function setupDragging() {
    if (!windowRef) return;
    if (interactable) interactable.unset();

    const windowId = `window-${props.programId}`;
    windowRef.dataset.windowId = windowId;

    const restrictionRect = {
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight - TASKBAR_HEIGHT_PX,
    };

    interactable = interact(windowRef).draggable({
      allowFrom: '.title-bar', // Only allow dragging from title bar
      inertia: false,
      modifiers: [
        interact.modifiers.restrictRect({
          restriction: restrictionRect,
          endOnly: false,
        }),
      ],
      listeners: {
        start(event) {
          bringToFront(props.programId);
          const _currentPos = syncPositionFromDOM(); // Sync local signal just before drag
          void _currentPos; // Preserved for future use

          if (isMaximized()) {
            handleMaximize();

            // --- Adjust position to follow cursor ---
            const restoredWidth = previousState().width;
            const restoredHeight = previousState().height;
            const titleBar = windowRef?.querySelector('.title-bar');
            const titleBarRect = titleBar?.getBoundingClientRect();

            if (titleBarRect && restoredWidth > 0 && restoredHeight > 0) {
              const clickOffsetX = Math.min(event.clientX - titleBarRect.left, restoredWidth - 20); // Avoid grabbing far right
              const clickOffsetY = event.clientY - titleBarRect.top;

              let newX = event.clientX - clickOffsetX;
              let newY = event.clientY - clickOffsetY;

              // Clamp position to new boundaries
              newX = Math.max(
                restrictionRect.left,
                Math.min(newX, restrictionRect.right - restoredWidth),
              );
              newY = Math.max(
                restrictionRect.top,
                Math.min(newY, restrictionRect.bottom - restoredHeight),
              );

              setPosition({ x: newX, y: newY });
              if (windowRef) {
                windowRef.style.transform = `translate(${newX}px, ${newY}px)`;
              }

              setPreviousState((prev) => ({ ...prev, x: newX, y: newY }));
            }
          }

          setIsDragging(true);
          if (windowRef) windowRef.style.userSelect = 'none';
        },
        move(event) {
          if (!isDragging()) return;

          // Position is updated directly by interact.js modifier + transform style
          const currentPos = position();
          const newX = currentPos.x + event.dx;
          const newY = currentPos.y + event.dy;

          setPosition({ x: newX, y: newY });
          event.target.style.transform = `translate(${newX}px, ${newY}px)`;
        },
        end() {
          if (!isDragging()) return;

          const finalPos = syncPositionFromDOM();
          updateProgramPosition(props.programId, finalPos.x, finalPos.y);

          setTimeout(() => setIsDragging(false), 0);
          if (windowRef) windowRef.style.userSelect = '';
        },
      },
    });
  }

  function cleanupInteract() {
    if (interactable) {
      interactable.unset();
      interactable = undefined;
    }
  }

  // --- Lifecycle Hooks ---
  onMount(() => {
    setupDragging();
    window.addEventListener('resize', handleBrowserResize);
  });

  onCleanup(() => {
    cleanupInteract();
    window.removeEventListener('resize', handleBrowserResize);
  });

  return (
    <div
      ref={setWindowRef}
      class="window flex-col box-border touch-none select-none fixed"
      onClick={(e) => {
        if (isDragging()) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        const S = programState();
        if (S && S.isMinimized) {
          handleUnMinimize();
        } else {
          bringToFront(props.programId);
        }
      }}
      onMouseDown={(e) => {
        if (isDragging()) e.stopPropagation();
      }}
    >
      {/* Window Controls */}
      <div
        class="window-controls absolute top-2 right-2 z-10 flex"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          class="min-w-0 flex items-center w-6 h-6 p-0 title-bar-controls"
          aria-label="Minimize"
          onClick={(e) => {
            e.stopPropagation();
            handleMinimize();
          }}
          disabled={programState()?.isMinimized}
        >
          <Minus class="text-[#4604ec]" />
        </button>
        <button
          class="min-w-0 flex items-center w-6 h-6 p-0 title-bar-controls"
          aria-label={isMaximized() ? 'Restore' : 'Maximize'}
          onClick={(e) => {
            e.stopPropagation();
            handleMaximize();
          }}
          disabled={programState()?.isMinimized}
        >
          <Show when={isMaximized()} fallback={<ArrowsPointingOut class="text-[#4604ec]" />}>
            <ArrowsPointingIn class="text-[#4604ec]" />
          </Show>
        </button>
        <button
          class="min-w-0 flex items-center w-6 h-6 p-0 title-bar-controls"
          aria-label="Close"
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
        >
          <X class="text-white" />
        </button>
      </div>

      {/* Title Bar - Now without the control buttons */}
      <div
        class="title-bar cursor-grab"
        onMouseDown={(e) => {
          if (isDragging()) e.stopPropagation();
        }}
      >
        <div class="title-bar-text select-none">{props.label}</div>
      </div>
      <div class="window-body flex-1 p-0 m-0 overflow-hidden">{props.children}</div>
    </div>
  );
}
