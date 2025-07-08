import type { JSXElement} from 'solid-js';
import { createEffect, createSignal, onCleanup, onMount, Show } from 'solid-js';
import interact from 'interactjs';
import { usePrograms, TASKBAR_HEIGHT_PX } from '../ProgramWindow/programContext';
import X from '../Icons/X';

interface WGPUNotificationWindowProps {
  label: string;            // window title
  programId: string;
  children: JSXElement;     // the content within the program window
  onClose?: () => void;     // optional custom close handler
}

export default function WGPUNotificationWindow(props: WGPUNotificationWindowProps) {
  const {
    unregisterProgram,
    bringToFront,
    activePrograms,
    updateProgramPosition,
  } = usePrograms();

  const getProgramState = () => activePrograms.find(p => p.id === props.programId);
  const programState = () => getProgramState();

  // --- State Management ---
  // Position driven by context, local signal helps smooth drag updates
  const [position, setPosition] = createSignal({ x: 0, y: 0 });

  // Window state
  const [isDragging, setIsDragging] = createSignal(false);

  let windowRef: HTMLDivElement | undefined;
  let interactable: Interact.Interactable | undefined;

  // Sync local position signal WITH context state initially and when context changes
  createEffect(() => {
    const state = programState();
    if (state && !isDragging()) {
      setPosition({ x: state.x, y: state.y });
    }
  });

  // --- DOM Manipulation and Effects ---
  function setWindowRef(el: HTMLDivElement) {
    windowRef = el;
    applyStateToDOM();
  };

  function applyStateToDOM() {
    if (!windowRef) return;
    const state = programState();
    if (state) {
      const currentPos = position();
      windowRef.style.transform = `translate(${currentPos.x}px, ${currentPos.y}px)`;
      windowRef.style.zIndex = String(state.zIndex || 1);
      windowRef.style.width = `${state.width}px`;
      windowRef.style.height = `${state.height}px`;
      windowRef.classList.toggle('hidden', !!state.isMinimized);
      windowRef.classList.toggle('flex', !state.isMinimized);
    }
  }

  createEffect(() => {
    const state = programState();
    const pos = position();
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

    interactable = interact(windowRef)
      .draggable({
        allowFrom: '.title-bar', // Only allow dragging from title bar
        inertia: false,
        modifiers: [
          interact.modifiers.restrictRect({
            restriction: restrictionRect,
            endOnly: false,
          })
        ],
        listeners: {
          start(event) {
            bringToFront(props.programId);
            syncPositionFromDOM(); // Sync local signal just before drag
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
          end(event) {
            if (!isDragging()) return;

            const finalPos = syncPositionFromDOM();
            updateProgramPosition(props.programId, finalPos.x, finalPos.y);

            setTimeout(() => setIsDragging(false), 0);
            if (windowRef) windowRef.style.userSelect = '';
          }
        }
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

  // --- Render ---
  const state = programState();

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

        bringToFront(props.programId);
      }}
      onMouseDown={(e) => { if (isDragging()) e.stopPropagation(); }}
    >
      {/* Window Controls - Only Close Button */}
      <div class="window-controls absolute top-2 right-2 z-10 flex"
        onClick={(e) => e.stopPropagation()}>
        <button
          class="min-w-0 flex items-center w-6 h-6 p-0 title-bar-controls"
          aria-label="Close"
          onClick={(e) => { e.stopPropagation(); handleClose(); }}
        >
          <X class="text-white" />
        </button>
      </div>

      {/* Title Bar */}
      <div class="title-bar cursor-grab"
        onMouseDown={(e) => { if (isDragging()) e.stopPropagation(); }}
      >
        <div class="title-bar-text select-none">{props.label}</div>
      </div>
      <div class="window-body flex-1 p-0 m-0 overflow-hidden">
        {props.children}
      </div>
    </div>
  );
}