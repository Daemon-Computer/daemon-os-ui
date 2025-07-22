import { Show } from 'solid-js';
import type { Program } from '../../api/program/types';
import StatsList from '../StatsList';
import { DEFAULT_PROGRAM_VIEW_MODEL } from '../../api/program/constants';

const DEFAULT_PROGRAM_DATA_PLACEHOLDER: Program = {
  id: 'default-placeholder',
  name: 'NO DAE-MON SELECTED',
  suiObjectId: '',
  source: 'N/A',
  type: 'N/A',
  speed: 0,
  corruption: 0,
  maxHealth: 0,
  health: 0,
  damage: 0,
  mintDate: 'N/A',
  protocol: 'N/A',
  viewModel: DEFAULT_PROGRAM_VIEW_MODEL,
};

interface ProgramDetailsProps {
  selectedProgram: Program | null;
  webGPUError: string | null;
}

export default function ProgramDetails(props: ProgramDetailsProps) {
  const displayData = () => props.selectedProgram ?? DEFAULT_PROGRAM_DATA_PLACEHOLDER;

  return (
    <div class="flex items-center">
      <div class="flex-col mx-2 w-full">
        <div class="flex justify-between status-bar-field px-2 items-center">
          <div class="font-bold ml-2 truncate" title={displayData().name}>
            {displayData().name}
          </div>
          <div class="flex gap-2 text-gray-500 mr-2 text-xs truncate">
            Decrypted: <p class="italic truncate">{displayData().mintDate}</p>
          </div>
        </div>
        <div class="mt-4 text-sm">
          <div class="flex justify-between">
            <div>Source</div>
            <div class="truncate">{displayData().source}</div>
          </div>
          <div class="flex justify-between">
            <div>Type</div>
            <div class="truncate">{displayData().type}</div>
          </div>
          <Show when={props.webGPUError}>
            <div class="flex justify-between text-yellow-600 mt-2">
              <div>Render Status</div>
              <div class="truncate">WebGPU Issue</div>
            </div>
          </Show>
        </div>
        <div class="mt-4">
          <div class="flex text-sm">
            <div class="w-1/2 pr-1 overflow-hidden">
              <StatsList program={displayData()} />
            </div>
            <div class="w-1/2 overflow-hidden">
              <div class="font-bold mb-1 text-right">Attacks</div>
              <div class="flex-col h-full text-right">
                <Show
                  when={
                    props.selectedProgram &&
                    displayData().name !== DEFAULT_PROGRAM_DATA_PLACEHOLDER.name
                  }
                  fallback={
                    <>
                      <div class="status-bar-field">-</div> <div class="status-bar-field">-</div>
                      <div class="status-bar-field">-</div> <div class="status-bar-field">-</div>
                    </>
                  }
                >
                  <div class="status-bar-field">Slash</div> <div class="status-bar-field">Bite</div>
                  <div class="status-bar-field">Roar</div> <div class="status-bar-field">Hide</div>
                </Show>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
