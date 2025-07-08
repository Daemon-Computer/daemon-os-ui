import { usePrograms } from '../ProgramWindow/programContext';
import { createEffect, createSignal, onCleanup, onMount, untrack, For } from 'solid-js';
import { WalletProvider } from '../Wallet/WalletContext';
import WalletApp from '../Wallet/WalletApp';

export default function Taskbar() {
  const {
    activePrograms,
    minimizeProgram,
    restoreProgram,
    bringToFront,
    updateMinimizeTarget,
    registerProgram,
    isRunning
  } = usePrograms();
  const [currentDateTime, setCurrentDateTime] = createSignal(new Date());

  const taskbarButtonRefs = new Map<string, HTMLButtonElement>();

  createEffect(() => {
    const programs = activePrograms;
    requestAnimationFrame(() => {
      untrack(() => { // Don't make effect depend on individual program fields
        programs.forEach(program => {
          const buttonRef = taskbarButtonRefs.get(program.id);
          if (buttonRef) {
            const rect = buttonRef.getBoundingClientRect();

            // Calculate center of the button for a nicer animation target
            const targetX = rect.left + rect.width / 2;
            const targetY = rect.top + rect.height / 2;

            // Check if the target actually changed before updating context
            if (program.minimizeTargetX !== targetX || program.minimizeTargetY !== targetY) {
              updateMinimizeTarget(program.id, targetX, targetY);
            }
          }
        });
      });
    });
  });


  function handleTaskbarProgramClick(programId: string) {
    const program = activePrograms.find(p => p.id === programId);
    if (!program) return;

    if (program.isMinimized) {
      restoreProgram(programId);
    } else {

      // Find the highest zIndex among non-minimized windows
      const maxZIndex = activePrograms
        .filter(p => !p.isMinimized)
        .reduce((max, p) => Math.max(max, p.zIndex), 0);

      if (program.zIndex === maxZIndex) {
        // It's already the top-most window, so minimize it
        minimizeProgram(programId);
      } else {
        // It's not minimized and not the top-most, so bring it to the front
        bringToFront(programId);
      }
    }
  }

  const handleWalletClick = () => {
    const walletLabel = 'Wallet';
    if (isRunning(walletLabel)) {
      const walletProgram = activePrograms.find(p => p.label === walletLabel);
      if (walletProgram) {
        handleTaskbarProgramClick(walletProgram.id);
      }
    } else {
      registerProgram({
        label: walletLabel,
        iconPath: '/icons/wallet.avif',
        component: WalletApp,
        initialWidth: 720,
        initialHeight: 480,
      });
    }
  };

  // Example "10:30 AM"
  const formatTime = (date: Date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    return `${hours}:${minutes} ${ampm}`;
  };

  // Example "3/11/2025"
  const formatDate = (date: Date) => `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;

  // Update the time every minute
  onMount(() => {
    setCurrentDateTime(new Date());

    const intervalId = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000); // Update every minute

    onCleanup(() => clearInterval(intervalId));
  });

  return (
    <div class='window w-full fixed bottom-0 left-0 z-50' id='taskbar'>
      <div class='my-2 p-1 h-6 flex justify-between items-center'>
        {/* Programs section - left side */}
        <div class="flex gap-1 items-center overflow-x-auto">
          <For each={activePrograms}>{(program) => (
            <button
              class={`
                px-2 py-1 
                min-w-[120px] 
                flex items-center gap-2 
                hover:bg-gray-200 
                ${program.isMinimized ? 'bg-gray-100' : ''}
              `}
              onClick={() => handleTaskbarProgramClick(program.id)}
            >
              <img
                src={program.iconPath}
                alt=""
                class="w-6 h-6"
              />
              <span class="truncate text-sm">
                {program.label}
              </span>
            </button>
          )}</For>
        </div>

        {/* System tray - right side */}
        <div class="flex items-center ml-2 border-l border-gray-400 pl-2">
          {/* Wallet button */}
          <button
            class="taskbar-wallet-btn px-2 flex items-center justify-center hover:bg-gray-200"
            title="Open Wallet"
            onClick={handleWalletClick}
          >
            <img
              src="/icons/wallet.avif"
              alt="Wallet"
              class="w-8 h-8"
            />
          </button>

          {/* Date & Time */}
          <div class="px-2 text-[10px] leading-tight select-none">
            <div class="text-right">{formatTime(currentDateTime())}</div>
            <div class="text-right">{formatDate(currentDateTime())}</div>
          </div>
        </div>
      </div>
    </div>
  );
}