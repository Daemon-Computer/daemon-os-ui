import { createSignal, createEffect, Show, onMount, onCleanup } from 'solid-js';
import { useWallet } from './Wallet/WalletContext';
import { Transaction } from '@mysten/sui/transactions';
import type {
  SuiTransactionBlockResponse,
  SuiTransactionBlockResponseOptions,
} from '@mysten/sui/client';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { MIST_PER_SUI } from '@mysten/sui/utils';
import WasmIframeWrapper from './WasmIframeWrapper';
import type { WasmCanvasBridgeInterface } from './hooks/createWasmCanvas';
import { usePrograms } from './ProgramWindow/programContext';
import WalletApp from './Wallet/WalletApp';
import {
  DAEMON_PACKAGE_ID,
  PROGRAM_REGISTRY_OBJECT_ID,
  PROGRAM_MINTER_OBJECT_ID,
  DISTRIBUTION_TABLE_OBJECT_ID,
  DRIVE_MINTER_OBJECT_ID,
  WASM_ENGINE_URL,
  WASM_BINDINGS_URL,
} from '../api/constants';

interface SignAndExecuteMethodHolder {
  signAndExecuteTransactionBlock: (args: {
    transactionBlock: Transaction;
    chain: string;
    account: any;
    options?: SuiTransactionBlockResponseOptions;
  }) => Promise<SuiTransactionBlockResponse>;
}

interface ShopConfig {
  priceMist: bigint | null;
  priceSui: string | null;
  isMinterEnabled: boolean;
}

interface UserDrive {
  id: string;
  name: string;
  imageURL: string;
}

export default function DrivesAndPrograms() {
  const { state, refreshBalances: _refreshBalances } = useWallet();
  const { activePrograms, restoreProgram, bringToFront, registerProgram } = usePrograms();
  const [isLoading, setIsLoading] = createSignal(false);
  const [isConfigLoading, setIsConfigLoading] = createSignal(true);
  const [, setStatusMessage] = createSignal('');
  const [, setStatusType] = createSignal<'info' | 'success' | 'error' | 'warning'>('info');
  const [userDrives, setUserDrives] = createSignal<UserDrive[]>([]);
  const [shopConfig, setShopConfig] = createSignal<ShopConfig>({
    priceMist: null,
    priceSui: null,
    isMinterEnabled: false,
  });
  const [configValid, setConfigValid] = createSignal(false);
  const [viewerBridge, setViewerBridge] = createSignal<WasmCanvasBridgeInterface | null>(null);
  const [webGPUSupported, setWebGPUSupported] = createSignal(true); // Assume true until checked

  // Check WebGPU support on mount
  onMount(() => {
    if (typeof navigator !== 'undefined' && !('gpu' in navigator)) {
      setWebGPUSupported(false);
      console.error('WebGPU Check Failed: Not supported in this browser.');
    } else {
      console.log('WebGPU Check Passed.');
    }
  });

  const launchWalletApp = () => {
    const walletLabel = 'Wallet';
    const existingWalletProgram = activePrograms.find((p) => p.label === walletLabel);

    if (existingWalletProgram) {
      if (existingWalletProgram.isMinimized) {
        restoreProgram(existingWalletProgram.id);
      } else {
        bringToFront(existingWalletProgram.id);
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

  const sendDefaultDriveModel = () => {
    const bridge = viewerBridge();
    if (bridge?.isReady()) {
      // Use Drive: null which was triggering the model loading
      console.log('Sending Drive: null event to trigger model loading');
      bridge.queueEventForWasm({ Drive: null as any });
    }
  };

  const handleWasmReady = (bridge: WasmCanvasBridgeInterface) => {
    console.log('DrivesAndPrograms WASM canvas is ready.');
    setViewerBridge(bridge);

    // Add listener for events coming back from WASM
    const unsubscribe = bridge.onWasmEvent((event) => {
      console.log('Received event from WASM:', event);
    });

    // Clean up the listener when component is disposed
    onCleanup(() => {
      console.log('Cleaning up WASM event listener');
      unsubscribe();
    });

    console.log('Sending drive model now');
    sendDefaultDriveModel();
  };

  const getSuiClient = () =>
    // state.network is guaranteed to be a valid NetworkType ('mainnet' | 'testnet')
    new SuiClient({ url: getFullnodeUrl(state.network) });
  const canBuyDrive = () => {
    // Check if wallet is connected
    if (!state.isConnected || !state.activeAccount) return false;

    // Check if shop config is valid
    if (isConfigLoading() || !shopConfig().isMinterEnabled) return false;

    // Check if price is available
    if (shopConfig().priceMist === null || shopConfig().priceSui === null) return false;

    // Check if user has enough balance
    const suiBalance = state.balances.find((b) => b.symbol === 'SUI');
    if (shopConfig().priceMist && suiBalance && suiBalance.balance) {
      try {
        const balanceAmount = BigInt(suiBalance.balance);
        if (balanceAmount < shopConfig().priceMist!) return false;
      } catch {
        return false;
      }
    }

    if (isLoading()) return false;

    if (!configValid()) return false;

    return true;
  };

  const canMintProgram = () => {
    if (!state.isConnected || !state.activeAccount) return false;

    if (userDrives().length === 0) return false;

    if (isLoading()) return false;

    if (!configValid()) return false;

    return true;
  };

  const checkRequiredIds = (): boolean => {
    const areAllIdsSet =
      DAEMON_PACKAGE_ID &&
      !DAEMON_PACKAGE_ID.includes('PLACEHOLDER') &&
      DRIVE_MINTER_OBJECT_ID &&
      !DRIVE_MINTER_OBJECT_ID.includes('PLACEHOLDER') &&
      PROGRAM_MINTER_OBJECT_ID &&
      !PROGRAM_MINTER_OBJECT_ID.includes('PLACEHOLDER') &&
      PROGRAM_REGISTRY_OBJECT_ID &&
      !PROGRAM_REGISTRY_OBJECT_ID.includes('PLACEHOLDER') &&
      DISTRIBUTION_TABLE_OBJECT_ID &&
      !DISTRIBUTION_TABLE_OBJECT_ID.includes('PLACEHOLDER');

    setConfigValid(areAllIdsSet);

    if (!areAllIdsSet) {
      setStatusMessage('Configuration error: Required Object IDs not set correctly');
      setStatusType('error');
      console.error('Placeholder IDs detected. Update DrivesAndPrograms.tsx.');
    }
    return areAllIdsSet;
  };

  const fetchShopConfig = async () => {
    if (!checkRequiredIds()) {
      setIsConfigLoading(false);
      return;
    }
    if (!state.isConnected) {
      setIsConfigLoading(false);
      return;
    }

    setIsConfigLoading(true);
    const client = getSuiClient();

    try {
      const minterObject = await client.getObject({
        id: DRIVE_MINTER_OBJECT_ID,
        options: { showContent: true },
      });

      if (minterObject.data?.content?.dataType === 'moveObject') {
        const fields = minterObject.data.content.fields as any;
        const priceMist = BigInt(fields.price || '0');
        const priceSui = (Number(priceMist) / Number(MIST_PER_SUI)).toFixed(2);
        const isMinterEnabled = fields.enabled === true;

        setShopConfig({ priceMist, priceSui, isMinterEnabled });
      } else {
        throw new Error('Could not parse EncryptedDriveMinter object content');
      }
    } catch (error) {
      console.error('Error fetching shop configuration:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setStatusMessage(`Error loading shop: ${errorMessage}`);
      setStatusType('error');
      setShopConfig({ priceMist: null, priceSui: null, isMinterEnabled: false });
    } finally {
      setIsConfigLoading(false);
    }
  };

  const fetchUserDrives = async () => {
    if (!state.isConnected || !state.activeAccount) {
      setUserDrives([]);
      return;
    }

    if (!DAEMON_PACKAGE_ID || DAEMON_PACKAGE_ID.includes('PLACEHOLDER')) {
      setStatusMessage('Configuration error: Invalid package ID');
      setStatusType('error');
      setUserDrives([]);
      return;
    }

    setIsLoading(true);
    setStatusMessage('Fetching drives...');
    setStatusType('info');
    const client = getSuiClient();
    const ownerAddress = state.activeAccount.address;
    const driveType = `${DAEMON_PACKAGE_ID}::encrypted_drive::EncryptedDrive`;

    try {
      const ownedObjects = await client.getOwnedObjects({
        owner: ownerAddress,
        options: {
          showType: true,
          showContent: true,
          showDisplay: true,
        },
      });

      const drives: UserDrive[] = ownedObjects.data
        .map((obj) => {
          if (
            obj.data?.type === driveType &&
            obj.data?.content?.dataType === 'moveObject' &&
            obj.data.content.fields
          ) {
            return {
              id: obj.data.objectId,
              name: `Encrypted Drive`,
              imageURL: `/icons/drive-default.gif`,
            };
          } else {
            return null;
          }
        })
        .filter((drive): drive is UserDrive => drive !== null);

      setUserDrives(drives);

      if (drives.length === 0) {
        setStatusMessage('No drives found in your wallet');
        setStatusType('info');
      } else {
        setStatusMessage(`Found ${drives.length} drive${drives.length !== 1 ? 's' : ''}`);
        setStatusType('success');
      }
    } catch (error) {
      console.error('Error fetching user drives:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setStatusMessage(`Error fetching drives: ${errorMsg}`);
      setStatusType('error');
      setUserDrives([]);
    } finally {
      setIsLoading(false);
    }
  };

  const buyEncryptedDrive = async () => {
    if (!state.isConnected || !state.activeAccount || !state.selectedWallet) {
      setStatusMessage('Please connect your wallet first');
      setStatusType('warning');
      return;
    }

    if (!checkRequiredIds()) {
      setStatusMessage('Cannot purchase: Configuration error');
      setStatusType('error');
      return;
    }

    const currentShopConfig = shopConfig();
    if (isConfigLoading() || currentShopConfig.priceMist === null) {
      setStatusMessage('Cannot purchase: Shop configuration loading or invalid');
      setStatusType('warning');
      return;
    }

    if (!currentShopConfig.isMinterEnabled) {
      setStatusMessage('Cannot purchase: Shop is currently disabled');
      setStatusType('warning');
      return;
    }

    setIsLoading(true);
    setStatusMessage(`Purchasing drive for ${currentShopConfig.priceSui} SUI...`);
    setStatusType('info');
    const currentPackageId = DAEMON_PACKAGE_ID;
    const currentMinterId = DRIVE_MINTER_OBJECT_ID;
    const priceInMist = currentShopConfig.priceMist;

    try {
      const tx = new Transaction();
      const [paymentCoin] = tx.splitCoins(tx.gas, [priceInMist]);
      const targetFunction = `${currentPackageId}::encrypted_drive::mint`;

      tx.moveCall({
        target: targetFunction,
        arguments: [tx.object(currentMinterId), paymentCoin],
        typeArguments: ['0x2::sui::SUI'],
      });

      const signAndExecute = state.selectedWallet.features[
        'sui:signAndExecuteTransactionBlock'
      ] as SignAndExecuteMethodHolder;
      if (!signAndExecute)
        throw new Error('Wallet does not support signAndExecuteTransactionBlock');

      const result = await signAndExecute.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        chain: state.activeAccount.chains[0],
        account: state.activeAccount,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
          showBalanceChanges: true,
        },
      });

      if (result.effects?.status?.status === 'success') {
        setStatusMessage(`Successfully purchased 1 Encrypted Drive!`);
        setStatusType('success');
        await fetchUserDrives();
        await _refreshBalances();
      } else {
        const errorMsg = result.effects?.status?.error || 'Unknown execution error';
        throw new Error(`Transaction failed: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Error buying encrypted drive:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('GasBalanceTooLow')) {
        setStatusMessage(`Error: Insufficient SUI balance`);
      } else if (
        errorMessage.includes('IncorrectSigner') ||
        errorMessage.includes('Signature validation failed')
      ) {
        setStatusMessage(`Error: Wallet signature issue`);
      } else if (errorMessage.includes('EMintingDisabled')) {
        setStatusMessage(`Error: Purchasing is disabled`);
      } else if (errorMessage.includes('EIncorrectPaymentAmount')) {
        setStatusMessage(`Error: Incorrect payment amount`);
        await fetchShopConfig();
      } else {
        setStatusMessage(`Error: ${errorMessage}`);
      }
      setStatusType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const mintProgram = async () => {
    const drives = userDrives();

    if (!state.isConnected || !state.activeAccount || !state.selectedWallet) {
      setStatusMessage('Please connect wallet first');
      setStatusType('warning');
      return;
    }

    if (drives.length === 0) {
      setStatusMessage('You need at least one drive');
      setStatusType('warning');
      return;
    }

    if (!checkRequiredIds()) {
      setStatusMessage('Configuration error');
      setStatusType('error');
      return;
    }

    const driveToMint = drives[0];

    setIsLoading(true);
    setStatusMessage(`Decrypting drive...`);
    setStatusType('info');
    const currentProgramPkgId = DAEMON_PACKAGE_ID;
    const currentProgramMinterId = PROGRAM_MINTER_OBJECT_ID;
    const currentRegistryId = PROGRAM_REGISTRY_OBJECT_ID;
    const currentDistTableId = DISTRIBUTION_TABLE_OBJECT_ID;

    try {
      const tx = new Transaction();
      const targetFunction = `${currentProgramPkgId}::monster::generate`;
      const moveCallArgs = [
        tx.object(currentProgramMinterId),
        tx.object(driveToMint.id),
        tx.object(currentRegistryId),
        tx.object(currentDistTableId),
        tx.object.random(),
      ];

      tx.moveCall({ target: targetFunction, arguments: moveCallArgs });

      const signAndExecute = state.selectedWallet.features[
        'sui:signAndExecuteTransactionBlock'
      ] as SignAndExecuteMethodHolder;
      if (!signAndExecute) throw new Error('Wallet lacks signAndExecute feature');

      const result = await signAndExecute.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        chain: state.activeAccount.chains[0],
        account: state.activeAccount,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
          showBalanceChanges: true,
        },
      });

      if (result.effects?.status?.status === 'success') {
        setStatusMessage(`Successfully minted a program! Check your collection.`);
        setStatusType('success');
        await fetchUserDrives();
        await _refreshBalances();
      } else {
        const errorMsg = result.effects?.status?.error || 'Unknown execution error';
        throw new Error(`Minting failed: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Error minting program:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setStatusMessage(`Error: ${errorMsg}`);
      setStatusType('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize everything when connected
  createEffect(() => {
    checkRequiredIds();
    if (state.isConnected) {
      fetchShopConfig();
      fetchUserDrives();
    } else {
      setUserDrives([]);
      setShopConfig({ priceMist: null, priceSui: null, isMinterEnabled: false });
      setStatusMessage('Connect wallet to access drives and programs');
      setStatusType('info');
    }
  });

  return (
    <div class="flex flex-col h-full w-full p-2">
      {/* Window content */}
      <div class="flex-1 flex flex-col">
        {/* Connection State */}
        <Show when={!state.isConnected}>
          <div class="flex-1 flex flex-col items-center justify-center">
            <div class="text-center mb-4">
              <p class="mb-2">Please connect your wallet to access drives and programs</p>
            </div>

            {/* Wallet connection button */}
            <button
              class="mt-4 px-4 py-2 flex items-center gap-2"
              onClick={(e) => {
                e.stopPropagation();
                launchWalletApp();
              }}
            >
              Open Wallet
            </button>
          </div>
        </Show>

        {/* Main Content when Connected */}
        <Show when={state.isConnected}>
          <div class="flex-1 flex flex-col items-center justify-center p-4">
            {/* 3D Drive Model */}
            <div class="mb-6 h-40 w-40">
              {/* Show WebGPU error message if not supported */}
              <Show when={!webGPUSupported()}>
                <div class="flex items-center justify-center h-full text-center text-red-500 border border-red-300 p-2">
                  <div>
                    <p>WebGPU Not Supported</p>
                    <p class="text-xs mt-1">Please use a browser that supports WebGPU</p>
                  </div>
                </div>
              </Show>

              {/* Render the 3D model if WebGPU is supported */}
              <Show when={webGPUSupported()}>
                <div class="h-full w-full border border-gray-300">
                  <WasmIframeWrapper
                    instanceId="drives-model-viewer"
                    jsPath={WASM_BINDINGS_URL}
                    wasmPath={WASM_ENGINE_URL}
                    onReady={handleWasmReady}
                  />
                </div>
              </Show>
            </div>

            {/* Drive Count */}
            <div class="text-center mb-6">
              <p class="text-2xl font-bold">{userDrives().length} drives owned</p>
            </div>

            {/* Buy Button */}
            <button
              onClick={buyEncryptedDrive}
              disabled={!canBuyDrive()}
              class={`w-64 mb-4 ${!canBuyDrive() ? 'opacity-70 cursor-not-allowed bg-gray-300' : ''}`}
            >
              {isLoading()
                ? 'Purchasing...'
                : shopConfig().priceSui
                  ? `Buy for ${shopConfig().priceSui} SUI`
                  : 'Loading price...'}
            </button>

            {/* Decrypt Button */}
            <button
              onClick={mintProgram}
              disabled={!canMintProgram()}
              class={`w-64 mb-4 ${!canMintProgram() ? 'opacity-70 cursor-not-allowed bg-gray-300' : ''}`}
            >
              {isLoading() ? 'Decrypting...' : 'Decrypt Drive'}
            </button>
          </div>
        </Show>
      </div>
    </div>
  );
}
