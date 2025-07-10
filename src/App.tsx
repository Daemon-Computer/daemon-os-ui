import "./98.css";
import type {
  Component} from "solid-js";
import {
  For,
  onMount,
  createSignal,
  Show,
} from "solid-js";
import Desktop from "./components/Desktop/Desktop";
import DesktopGrid from "./components/Desktop/DesktopGrid";
import DesktopIcon from "./components/Desktop/DesktopIcon";
import { usePrograms } from "./components/ProgramWindow/programContext";
import ProgramWindow from "./components/ProgramWindow/ProgramWindow";
import ProgramDatabase from "./components/ProgramDatabase";
import DrivesAndPrograms from "./components/DrivesAndPrograms";
import { WalletProvider } from "./components/Wallet/WalletContext";
import { ThemeProvider } from "./components/Theme/ThemeContext";
import SplashScreen from "./components/SplashScreen";
import "./fadeEffects.css";
import WalletApp from "./components/Wallet/WalletApp";
import WGPUNotificationApp from "./components/WGPUNotification/WGPUNotificationApp";
import WGPUNotificationWindow from "./components/WGPUNotification/WGPUNotificationWindow";

interface ProgramConfig {
  label: string;
  icon: string;
  component: Component;
  defaultWidth?: number;
  defaultHeight?: number;
  showOnDesktop?: boolean;
}

export interface LaunchProgramEvent {
  programLabel: string;
}

const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 480;

export const AVAILABLE_PROGRAMS: ProgramConfig[] = [
  {
    label: "WGPU Support Check",
    icon: "/icons/viewer.avif",
    component: WGPUNotificationApp,
    defaultWidth: 500,
    defaultHeight: 400,
    showOnDesktop: false,
  },
  {
    label: "Wallet",
    icon: "/icons/wallet.avif",
    component: WalletApp,
    defaultWidth: 480,
    defaultHeight: 520,
  },
  // {
  //     label: 'Test Program',
  //     icon: '/icons/huh.gif',
  //     component: TestWindow,
  //     defaultWidth: 600,
  //     defaultHeight: 400
  // },
  // {
  //   label: "Event Demo",
  //   icon: "/icons/yuukaWave.gif",
  //   component: ProgramEventDemo,
  //   defaultWidth: 480,
  //   defaultHeight: 540,
  // },
  {
    label: "Program Viewer",
    icon: "/icons/viewer.avif",
    component: ProgramDatabase,
    defaultWidth: 640,
    defaultHeight: 512,
  },
  {
    label: "Drives & Programs",
    icon: "/icons/store.avif",
    component: DrivesAndPrograms,
    defaultWidth: 400,
    defaultHeight: 520,
  },
];

export default function App() {
  const {
    registerProgram,
    activePrograms,
    restoreProgram,
    isRunning,
    unregisterProgram,
  } = usePrograms();
  const [isLoading, setIsLoading] = createSignal(true);
  const [fadeIn, setFadeIn] = createSignal(false);
  const [showOSUI, setShowOSUI] = createSignal(false);

  function launchProgram(programConfig: ProgramConfig) {
    const walletState = window.walletState; // Access the wallet state from window object

    // Check if wallet is connected
    if (
      programConfig.label !== "Wallet" &&
      programConfig.label !== "WGPU Support Check" &&
      walletState &&
      !walletState.isConnected
    ) {
      // Open wallet if it's not already running
      if (!isRunning("Wallet")) {
        const walletProgram = AVAILABLE_PROGRAMS.find(
          (p) => p.label === "Wallet",
        );
        if (walletProgram) {
          registerProgram({
            label: walletProgram.label,
            iconPath: walletProgram.icon,
            component: walletProgram.component,
            initialWidth: walletProgram.defaultWidth ?? DEFAULT_WIDTH,
            initialHeight: walletProgram.defaultHeight ?? DEFAULT_HEIGHT,
          });
        }
      }
      // Bring wallet to front if it's minimized
      const existingWalletProgram = activePrograms.find(
        (p) => p.label === "Wallet",
      );
      if (existingWalletProgram && existingWalletProgram.isMinimized) {
        restoreProgram(existingWalletProgram.id);
      }
      return;
    }

    if (isRunning(programConfig.label)) {
      const existingProgram = activePrograms.find(
        (p) => p.label === programConfig.label,
      );
      if (existingProgram) {
        if (existingProgram.isMinimized) {
          restoreProgram(existingProgram.id);
        } else {
          restoreProgram(existingProgram.id);
        }
      }
      return;
    }

    registerProgram({
      label: programConfig.label,
      iconPath: programConfig.icon,
      component: programConfig.component,
      initialWidth: programConfig.defaultWidth ?? DEFAULT_WIDTH,
      initialHeight: programConfig.defaultHeight ?? DEFAULT_HEIGHT,
    });
  }

  // Prevent closing the wallet app if not connected
  const handleCloseProgram = (programId: string) => {
    const program = activePrograms.find((p) => p.id === programId);
    if (program && program.label === "Wallet") {
      const walletState = window.walletState;
      if (walletState && !walletState.isConnected) {
        // Don't close the wallet if not connected
        return;
      }
    }
    
    // Launch wallet when WGPU notification is closed
    if (program && program.label === "WGPU Support Check") {
      unregisterProgram(programId);
      setTimeout(() => {
        const walletProgram = AVAILABLE_PROGRAMS.find(
          (p) => p.label === "Wallet",
        );
        if (walletProgram) {
          launchProgram(walletProgram);
        }
      }, 100);
      return;
    }
    
    unregisterProgram(programId);
  };

  onMount(() => {
    const handleLaunchProgramEvent = (
      event: CustomEvent<LaunchProgramEvent>,
    ) => {
      const programLabel = event.detail.programLabel;
      const program = AVAILABLE_PROGRAMS.find((p) => p.label === programLabel);
      if (program) {
        launchProgram(program);
      } else {
        console.warn(`Program "${programLabel}" not found`);
      }
    };
    window.addEventListener(
      "launchProgram",
      handleLaunchProgramEvent as EventListener,
    );
    return () =>
      window.removeEventListener(
        "launchProgram",
        handleLaunchProgramEvent as EventListener,
      );
  });

  const handleLoadingComplete = () => {
    setIsLoading(false);
    setTimeout(() => {
      setFadeIn(true);
      setTimeout(() => {
        setShowOSUI(true);
        // Launch WGPU notification first after splash screen
        setTimeout(() => {
          const wgpuProgram = AVAILABLE_PROGRAMS.find(
            (p) => p.label === "WGPU Support Check",
          );
          if (wgpuProgram) {
            launchProgram(wgpuProgram);
          }
        }, 500);
      }, 900);
    }, 100);
  };

  return (
    <Show
      when={!isLoading()}
      fallback={<SplashScreen onLoaded={handleLoadingComplete} />}
    >
      <div class={`fade-container ${fadeIn() ? "fade-in" : ""}`} />

      <Show when={showOSUI()}>
        <div class="fixed inset-0 z-50">
          <ThemeProvider>
            <WalletProvider>
              <Desktop>
                <>
                  <For each={activePrograms}>
                    {(program) => {
                      const programComponent = program.component as Component;
                      
                      // Use special window for WGPU notification
                      if (program.label === "WGPU Support Check") {
                        return (
                          <WGPUNotificationWindow
                            label={program.label}
                            programId={program.id}
                            onClose={() => handleCloseProgram(program.id)}
                          >
                            <WalletProvider>
                              {programComponent({})}
                            </WalletProvider>
                          </WGPUNotificationWindow>
                        );
                      }
                      
                      return (
                        <ProgramWindow
                          label={program.label}
                          programId={program.id}
                          onClose={() => handleCloseProgram(program.id)}
                        >
                          <WalletProvider>
                            {programComponent({})}
                          </WalletProvider>
                        </ProgramWindow>
                      );
                    }}
                  </For>

                  <DesktopGrid>
                    <For each={AVAILABLE_PROGRAMS.filter(p => p.showOnDesktop !== false)}>
                      {(programConfig) => (
                        <DesktopIcon
                          appName={programConfig.label}
                          appIcon={programConfig.icon}
                          program={programConfig.component}
                          onLaunch={() => launchProgram(programConfig)}
                        />
                      )}
                    </For>
                  </DesktopGrid>
                </>
              </Desktop>
            </WalletProvider>
          </ThemeProvider>
        </div>
      </Show>
    </Show>
  );
}
