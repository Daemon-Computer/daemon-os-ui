import { For, Show } from 'solid-js';
import type { Program } from '../../api/program/types';
import { useWallet } from '../Wallet/WalletContext';
import { PROGRAM_TYPE_STRING } from '../../api/constants';
import ArrowPath from '../Icons/ArrowPath';

interface ProgramListProps {
  programs: Program[];
  selectedProgram: Program | null;
  isLoading: boolean;
  error: string | null;
  onProgramSelect: (program: Program) => void;
  onRefresh: () => void;
}

export default function ProgramList(props: ProgramListProps) {
  const { state: walletState } = useWallet();

  return (
    <div class="w-[33%] flex flex-col ml-1 mr-2 min-w-0 overflow-hidden">
      <div class="flex justify-between items-center mb-2 pr-1">
        <button
          onClick={props.onRefresh}
          disabled={props.isLoading || !walletState.isConnected}
          class="text-xs px-2 py-1"
        >
          <ArrowPath class="w-4 h-4" />
        </button>
        <span class="font-bold truncate">Available DAE-MON/S ({props.programs.length})</span>
      </div>

      <Show when={props.error}>
        <div class="p-2 text-center text-sm text-red-600 bg-red-100 border border-red-300 mb-2 overflow-hidden text-ellipsis">
          Error loading programs: {props.error}
        </div>
      </Show>

      <div class="overflow-y-auto overflow-x-hidden p-1">
        <Show when={props.isLoading && props.programs.length === 0}>
          <div class="p-4 text-center text-sm italic">Loading DAE-MONs from wallet...</div>
        </Show>
        <Show when={!props.isLoading && props.programs.length === 0 && walletState.isConnected}>
          <div class="p-4 text-center text-sm italic overflow-hidden">
            No DAE-MONs found in your wallet for type{' '}
            <code class="text-xs bg-gray-200 p-0.5 rounded break-all">{PROGRAM_TYPE_STRING}</code>
            .
            <br /> Mint one in 'Drives & Programs'.
          </div>
        </Show>
        <Show when={!walletState.isConnected && !props.isLoading}>
          <div class="p-4 text-center text-sm italic">
            Connect your wallet to see your DAE-MONs.
          </div>
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
    </div>
  );
}
