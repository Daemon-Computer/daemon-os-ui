import { For, Show } from 'solid-js';
import { PROGRAM_TYPE_STRING } from '../../api/constants';
import type { ViewModel } from '../../api/game/events';

interface SuiProgramDataFields {
  id: { id: string };
  protocol: Record<string, null> | string;
  version: { number: number };
  generated_on: { number: number };
  palette: any;
  parts: any[];
}

interface Program {
  id: string;
  name: string;
  suiObjectId: string;
  source: string;
  type: string;
  speed: number;
  corruption: number;
  maxHealth: number;
  health: number;
  damage: number;
  mintDate: string;
  protocol: string;
  viewModel: ViewModel;
  rawFields?: SuiProgramDataFields;
}

interface ProgramsListProps {
  programs: Program[];
  selectedProgram: Program | null;
  isLoading: boolean;
  isWalletConnected: boolean;
  onProgramSelect: (program: Program) => void;
}

export default function ProgramsList(props: ProgramsListProps) {
  return (
    <div class="overflow-y-auto p-1" style={{ 'max-height': 'calc(100% - 10px)' }}>
      <Show when={props.isLoading && props.programs.length === 0}>
        <div class="p-4 text-center text-sm italic">Loading DAE-MONs from wallet...</div>
      </Show>
      <Show when={!props.isLoading && props.programs.length === 0 && props.isWalletConnected}>
        <div class="p-4 text-center text-sm italic overflow-hidden">
          No DAE-MONs found in your wallet for type{' '}
          <code class="text-xs bg-gray-200 p-0.5 rounded break-all">{PROGRAM_TYPE_STRING}</code>
          .
          <br /> Mint one in 'Drives & Programs'.
        </div>
      </Show>
      <Show when={!props.isWalletConnected && !props.isLoading}>
        <div class="p-4 text-center text-sm italic">Connect your wallet to see your DAE-MONs.</div>
      </Show>

      <For each={props.programs}>
        {(program) => (
          <div class="mb-1 cursor-pointer" onClick={() => props.onProgramSelect(program)}>
            <button
              class="w-full font-bold justify-between p-2 flex items-center gap-2 text-sm"
              classList={{ active: props.selectedProgram?.id === program.id }}
            >
              <div class="w-32 truncate text-left" title={program.name}>
                {program.name}
              </div>
            </button>
          </div>
        )}
      </For>
    </div>
  );
}
