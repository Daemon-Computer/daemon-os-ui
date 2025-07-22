import { createSignal, createEffect } from 'solid-js';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import type { Program } from '../../api/program/types';
import { fetchProgramsFromWallet } from '../../api/program/service';
import { useWallet } from '../Wallet/WalletContext';

export function useProgramData() {
  const { state: walletState } = useWallet();
  const [suiClient, setSuiClient] = createSignal<SuiClient | null>(null);
  const [programs, setPrograms] = createSignal<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = createSignal<Program | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  // Set up SUI client when network changes
  createEffect(() => {
    if (walletState.network) {
      // Directly use getFullnodeUrl as walletState.network is guaranteed to be valid by WalletContext
      const client = new SuiClient({
        url: getFullnodeUrl(walletState.network),
      });
      setSuiClient(client);
    }
  });

  // Fetch programs when wallet state or client changes
  createEffect(() => {
    if (walletState.isConnected && walletState.activeAccount && suiClient()) {
      fetchPrograms();
    } else {
      setPrograms([]);
      setSelectedProgram(null);
    }
  });

  // Auto-select first program when programs change
  createEffect(() => {
    const currentPrograms = programs();
    if (currentPrograms.length > 0 && !selectedProgram()) {
      setSelectedProgram(currentPrograms[0]);
    } else if (currentPrograms.length === 0) {
      setSelectedProgram(null);
    }
  });

  const fetchPrograms = async () => {
    if (!walletState.isConnected || !walletState.activeAccount || !suiClient()) {
      setPrograms([]);
      setSelectedProgram(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const client = suiClient()!;
      const address = walletState.activeAccount.address;
      const history = walletState.transactionHistory;

      const fetchedPrograms = await fetchProgramsFromWallet(client, address, history);

      setPrograms(fetchedPrograms);
      if (fetchedPrograms.length > 0) {
        setSelectedProgram(fetchedPrograms[0]);
      } else {
        setSelectedProgram(null);
      }
    } catch (e) {
      console.error('Error fetching or transforming programs:', e);
      setError(e instanceof Error ? e.message : String(e));
      setPrograms([]);
      setSelectedProgram(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProgramSelect = (program: Program) => {
    setSelectedProgram(program);
  };

  const refreshPrograms = () => {
    fetchPrograms();
  };

  return {
    programs,
    selectedProgram,
    isLoading,
    error,
    handleProgramSelect,
    refreshPrograms,
  };
}
