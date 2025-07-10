import type { JSXElement } from 'solid-js';
import { createContext, useContext, createSignal, createEffect, onMount } from 'solid-js';
import { createStore, produce } from 'solid-js/store';

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { getWallets, type Wallet, type WalletAccount } from '@mysten/wallet-standard';
import type {
  SuiTransactionBlockResponse,
  SuiTransactionBlockResponseQuery,
  PaginationArguments,
  OrderArguments,
} from '@mysten/sui/client';
import { DAEMON_PACKAGE_ID } from '../../api/constants';

// Define window property for TypeScript
declare global {
  interface Window {
    walletState: {
      isConnected: boolean;
      isConnecting: boolean;
    };
  }
}

export interface TokenBalance {
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  iconUrl?: string;
}

export type NetworkType = 'mainnet' | 'testnet';

export type TransactionHistoryItem = SuiTransactionBlockResponse;

export interface WalletState {
  isConnected: boolean;
  isConnecting: boolean;
  availableWallets: Wallet[];
  selectedWallet: Wallet | null;
  activeAccount: WalletAccount | null;
  balances: TokenBalance[];
  collections: {
    encryptedDrives: number;
    decryptedPrograms: number;
  };
  network: NetworkType;
  transactionHistory: TransactionHistoryItem[];
  isHistoryLoading: boolean;
  historyError: string | null;
  error: string | null;
}

interface WalletContextType {
  state: WalletState;
  connect: (walletName?: string) => Promise<boolean>;
  disconnect: () => Promise<void>;
  refreshBalances: () => Promise<void>;
  switchNetwork: (network: NetworkType) => void;
  fetchTransactionHistory: (options?: { force?: boolean }) => Promise<void>;
}

const walletContext = createContext<WalletContextType>();

export function WalletProvider(props: { children: JSXElement }) {
  // --- State Initialization ---
  const loadSavedState = () => {
    try {
      const savedState = localStorage.getItem('walletState');
      if (savedState) {
        return JSON.parse(savedState);
      }
    } catch (error) {
      console.error('Error loading saved wallet state:', error);
    }
    return {};
  };
  const savedState = loadSavedState();
  const [savedWalletName, setSavedWalletName] = createSignal(savedState.walletName || null);

  // Sanitize the network loaded from localStorage
  let initialNetworkSetting: NetworkType = 'testnet'; // True default fallback
  const persistedNetworkString = savedState.network as string;
  if (persistedNetworkString === 'mainnet' || persistedNetworkString === 'testnet') {
    initialNetworkSetting = persistedNetworkString as NetworkType;
  }
  const defaultNetwork: NetworkType = initialNetworkSetting;

  const [suiClient, setSuiClient] = createSignal(
    new SuiClient({ url: getFullnodeUrl(defaultNetwork) }),
  );

  const [state, setState] = createStore<WalletState>({
    isConnected: false,
    isConnecting: false,
    availableWallets: [],
    selectedWallet: null,
    activeAccount: null,
    balances: [],
    collections: { encryptedDrives: 0, decryptedPrograms: 0 },
    network: defaultNetwork,
    transactionHistory: [],
    isHistoryLoading: false,
    historyError: null,
    error: null,
  });

  // --- Effects ---
  onMount(() => {
    const walletAdapter: ReturnType<typeof getWallets> = getWallets();
    const initialWallets = walletAdapter.get();
    setState('availableWallets', initialWallets);
    const unsubscribe = walletAdapter.on(
      'change' as any,
      (event: { wallets: readonly Wallet[] }) => {
        setState('availableWallets', event.wallets);
      },
    );
    const walletName = savedWalletName();
    if (walletName && initialWallets.some((w) => w.name === walletName)) {
      setTimeout(() => {
        connect(walletName);
      }, 500);
    }
    return unsubscribe;
  });

  createEffect(() => {
    let accountToSave = null;
    if (state.activeAccount) {
      accountToSave = { address: state.activeAccount.address };
    }
    const stateToSave = {
      activeAccount: accountToSave,
      walletName: state.selectedWallet?.name,
      network: state.network,
    };
    try {
      localStorage.setItem('walletState', JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Error saving wallet state:', error);
    }
  });

  // Make wallet state available globally
  createEffect(() => {
    window.walletState = {
      isConnected: state.isConnected,
      isConnecting: state.isConnecting,
    };
  });

  // --- Core Functions ---

  const fetchTransactionHistory = async (options?: { force?: boolean }) => {
    if ((state.isHistoryLoading && !options?.force) || !state.isConnected || !state.activeAccount) {
      if (!state.isConnected || !state.activeAccount) setState('transactionHistory', []);
      return;
    }
    setState(
      produce((s) => {
        s.isHistoryLoading = true;
        s.historyError = null;
      }),
    );
    const client = suiClient();
    const address = state.activeAccount.address;
    const queryLimit = 30;

    type QueryTxBlocksArgs = SuiTransactionBlockResponseQuery &
      PaginationArguments<string | null> &
      OrderArguments;

    try {
      const queryParams: QueryTxBlocksArgs = {
        filter: { FromAddress: address },
        options: { showEffects: true, showInput: true },
        limit: queryLimit,
        order: 'descending',
      };
      const historyResponse = await client.queryTransactionBlocks(queryParams);
      const sortedHistory = historyResponse.data.sort(
        (a, b) => parseInt(b.timestampMs || '0') - parseInt(a.timestampMs || '0'),
      );
      setState('transactionHistory', sortedHistory);
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      setState(
        produce((s) => {
          s.historyError = error instanceof Error ? error.message : 'Unknown error';
          s.transactionHistory = [];
        }),
      );
    } finally {
      setState('isHistoryLoading', false);
    }
  };

  const refreshBalances = async (): Promise<void> => {
    if (state.activeAccount && state.isConnected) {
      try {
        const address = state.activeAccount.address;
        const client = suiClient();
        const ownerBalance = await client.getBalance({ owner: address, coinType: '0x2::sui::SUI' });
        const suiBalance = {
          symbol: 'SUI',
          name: 'Sui',
          balance: ownerBalance.totalBalance,
          decimals: 9,
        };
        const ownedObjects = await client.getOwnedObjects({
          owner: address,
          options: { showType: true },
        });
        let encryptedDrivesCount = 0;
        let decryptedProgramsCount = 0;
        const driveSuffix = `${DAEMON_PACKAGE_ID}::encrypted_drive::EncryptedDrive`;
        const programSuffix = `${DAEMON_PACKAGE_ID}::monster::Monster`;
        for (const obj of ownedObjects.data || []) {
          const type = obj.data?.type;
          if (type) {
            if (type === driveSuffix) encryptedDrivesCount++;
            else if (type === programSuffix) decryptedProgramsCount++;
          }
        }
        setState({
          balances: [suiBalance],
          collections: {
            encryptedDrives: encryptedDrivesCount,
            decryptedPrograms: decryptedProgramsCount,
          },
        });
      } catch (error) {
        console.error('Error refreshing balances/collections:', error);
      }
    }
  };

  const connect = async (walletName?: string): Promise<boolean> => {
    setState(
      produce((s) => {
        s.isConnecting = true;
        s.error = null;
        s.transactionHistory = [];
        s.historyError = null;
        s.balances = [];
        s.collections = { encryptedDrives: 0, decryptedPrograms: 0 };
      }),
    );
    try {
      const walletToConnect = walletName
        ? state.availableWallets.find((w) => w.name === walletName)
        : state.availableWallets[0];
      if (!walletToConnect) throw new Error('No compatible wallet found.');

      const connectFeature = walletToConnect.features['standard:connect'] as
        | { connect: () => Promise<void> }
        | undefined;
      if (!connectFeature)
        throw new Error(`${walletToConnect.name} doesn't support connect feature.`);

      await connectFeature.connect();

      if (walletToConnect.accounts.length > 0) {
        const newAccount = walletToConnect.accounts[0];
        setState(
          produce((s) => {
            s.selectedWallet = walletToConnect;
            s.activeAccount = newAccount;
            s.isConnected = true;
          }),
        );

        await refreshBalances();
        await fetchTransactionHistory();

        const eventsFeature = walletToConnect.features['standard:events'] as
          | {
              on: (
                event: 'change',
                listener: (params: { accounts?: readonly WalletAccount[] }) => void,
              ) => () => void;
            }
          | undefined;
        if (eventsFeature) {
          eventsFeature.on('change', ({ accounts }: { accounts?: readonly WalletAccount[] }) => {
            if (accounts?.length) {
              console.log('Wallet account changed via event.');
              setState('activeAccount', accounts[0]);
              refreshBalances();
              fetchTransactionHistory({ force: true });
            } else {
              console.log('Wallet accounts empty via event.');
              disconnect();
            }
          });
        }
        return true;
      } else {
        throw new Error('No accounts available in wallet');
      }
    } catch (error) {
      console.error('Connection error:', error);
      setState(
        produce((s) => {
          s.error = error instanceof Error ? error.message : 'Unknown error';
          s.isConnected = false;
          s.selectedWallet = null;
          s.activeAccount = null;
        }),
      );
      return false;
    } finally {
      setState('isConnecting', false);
    }
  };

  const disconnect = async (): Promise<void> => {
    if (state.selectedWallet && state.isConnected) {
      try {
        const disconnectFeature = state.selectedWallet.features['standard:disconnect'] as
          | { disconnect: () => Promise<void> }
          | undefined;
        if (disconnectFeature) {
          await disconnectFeature.disconnect();
        }
      } catch (error) {
        console.error('Error during disconnect:', error);
      } finally {
        setState(
          produce((s) => {
            s.isConnected = false;
            s.selectedWallet = null;
            s.activeAccount = null;
            s.balances = [];
            s.collections = { encryptedDrives: 0, decryptedPrograms: 0 };
            s.transactionHistory = [];
            s.historyError = null;
            s.error = null;
          }),
        );
        setSavedWalletName(null);
      }
    }
  };

  const switchNetwork = (requestedNetwork: NetworkType): void => {
    let targetNetwork = requestedNetwork;
    // Ensure that if mainnet is selected it reverts to testnet (mainnet is also disabled for now).
    // The check for 'devnet' (as string) is a safeguard for any lingering values from older
    // localStorage or direct calls, as 'devnet' is no longer a valid NetworkType.
    if (requestedNetwork === 'mainnet' || (requestedNetwork as string) === 'devnet') {
      console.warn(`Network ${requestedNetwork} is temporarily disabled. Reverting to testnet.`);
      targetNetwork = 'testnet';
    }

    if (state.network === targetNetwork) return;

    console.log(`Switching network to: ${targetNetwork}`);
    setState('network', targetNetwork);
    setSuiClient(new SuiClient({ url: getFullnodeUrl(targetNetwork) }));

    // If connected, disconnect to force re-evaluation of account and balances on new network
    if (state.isConnected) {
      disconnect().then(() => {
        console.log(
          'Disconnected due to network switch. Please reconnect if previously connected.',
        );
      });
    }
    // Persist the new network choice immediately
    try {
      const currentState = JSON.parse(localStorage.getItem('walletState') || '{}');
      localStorage.setItem(
        'walletState',
        JSON.stringify({ ...currentState, network: targetNetwork }),
      );
    } catch (error) {
      console.error('Error saving network state:', error);
    }
  };

  // --- Context Value ---
  const contextValue: WalletContextType = {
    state,
    connect,
    disconnect,
    refreshBalances,
    switchNetwork,
    fetchTransactionHistory,
  };

  return <walletContext.Provider value={contextValue}>{props.children}</walletContext.Provider>;
}

// --- Hook ---
export function useWallet() {
  const context = useContext(walletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
