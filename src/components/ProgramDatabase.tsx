import { createEffect } from 'solid-js';
import { useProgramData } from './hooks/useProgramData';
import { useWasmViewer } from './hooks/useWasmViewer';
import ProgramList from './ProgramDatabase/ProgramList';
import ProgramViewer from './ProgramDatabase/ProgramViewer';
import ProgramDetails from './ProgramDatabase/ProgramDetails';

export default function ProgramDatabase() {
  const programData = useProgramData();
  const wasmViewer = useWasmViewer();

  // Update viewer when program selection changes
  createEffect(() => {
    const selectedProgram = programData.selectedProgram();
    if (selectedProgram) {
      wasmViewer.sendProgramToWasm(selectedProgram);
    }
  });

  return (
    <div class="flex w-full h-full pt-2 overflow-hidden">
      <div class="flex w-full">
        {/* Left panel - Program list */}
        <ProgramList
          programs={programData.programs()}
          selectedProgram={programData.selectedProgram()}
          isLoading={programData.isLoading()}
          error={programData.error()}
          onProgramSelect={programData.handleProgramSelect}
          onRefresh={programData.refreshPrograms}
        />

        <div
          class="flex window w-full m-2 dynamic-window-bg"
          style={{ '--dynamic-window-bg': wasmViewer.windowBackgroundColor() }}
        >
          {/* Middle panel - Program viewer */}
          <ProgramViewer
            webGPUSupported={wasmViewer.webGPUSupported()}
            onViewerReady={wasmViewer.handleViewerReady}
          />

          {/* Right panel - Details */}
          <ProgramDetails
            selectedProgram={programData.selectedProgram()}
            webGPUError={wasmViewer.webGPUError()}
          />
        </div>
      </div>
    </div>
  );
}
