import { createSignal, Show, For, onMount } from 'solid-js';
import { useWallet, NetworkType, TransactionHistoryItem } from './WalletContext';
import { truncateAddress } from './utils/format';
import { LaunchProgramEvent } from '../../App';
import { DAEMON_PACKAGE_ID } from '../../api/constants';

function formatTimestamp(timestampMs: string | undefined): string {
    if (!timestampMs) return 'N/A';
    try {
        const date = new Date(parseInt(timestampMs));
        // Example format: "4/17/2024, 2:30:15 PM"
        return date.toLocaleString(undefined, {
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: 'numeric', minute: 'numeric', second: 'numeric'
        });
    } catch (e) {
        return 'Invalid Date';
    }
}

function getExplorerLink(network: NetworkType, digest: string): string {
    const baseUrl = 'https://suiscan.xyz';
    const networkPath = network === 'mainnet' ? 'mainnet' : 'testnet';
    return `${baseUrl}/${networkPath}/tx/${digest}`;
}

function getTransactionSummary(tx: TransactionHistoryItem): string {
    try {
        const kind = tx.transaction?.data?.transaction;
        if (!kind) return 'Unknown Kind';

        if (kind.kind === 'ProgrammableTransaction') {
            // common patterns
            const pt = kind;
            if (pt.transactions.length === 1 && 'TransferObjects' in pt.transactions[0]) {
                const count = pt.transactions[0].TransferObjects[0]?.length || 0;
                return `Transfer ${count} Object(s)`;
            }
            if (pt.transactions.length === 1 && 'SplitCoins' in pt.transactions[0]) {
                return `Split Coins`;
            }
            const moveCalls = pt.transactions.filter(t => 'MoveCall' in t);
            if (moveCalls.length > 0 && 'MoveCall' in moveCalls[0]) {
                const funcName = moveCalls[0].MoveCall.function;
                const packageName = moveCalls[0].MoveCall.package;

                // Use DAEMON_PACKAGE_ID for specific checks
                if (funcName === 'mint' && packageName === DAEMON_PACKAGE_ID && moveCalls[0].MoveCall.module === 'encrypted_drive') return 'Buy Encrypted Drive';
                if (funcName === 'generate' && packageName === DAEMON_PACKAGE_ID && moveCalls[0].MoveCall.module === 'monster') return 'Mint Program';

                const moduleName = moveCalls[0].MoveCall.module;
                return `Call: ${moduleName}::${funcName}`;
            }
            return 'Programmable Tx'; // Generic fallback
        } else if (kind.kind === 'ChangeEpoch') {
            return 'Epoch Change';
        } else {
            return kind.kind;
        }
    } catch (e) {
        console.error("Error parsing transaction summary:", e, tx);
        return 'Parsing Error';
    }
}

export default function WalletApp() {
    const { state, connect, disconnect, refreshBalances, switchNetwork, fetchTransactionHistory } = useWallet();
    const [selectedTab, setSelectedTab] = createSignal('overview');
    const [isRefreshing, setIsRefreshing] = createSignal(false); // Used for the combined refresh button
    const [showWalletSelector, setShowWalletSelector] = createSignal(false);

    function launchProgramByLabel(programLabel: string) {
        const event = new CustomEvent<LaunchProgramEvent>('launchProgram', {
            detail: { programLabel }
        });
        window.dispatchEvent(event);
    }

    // Combined refresh for balances, collections, and history
    const handleRefreshAll = async () => {
        if (!state.isConnected) return;
        setIsRefreshing(true);
        // Trigger fetches concurrently
        await Promise.allSettled([
            refreshBalances(),
            fetchTransactionHistory({ force: true })
        ]);
        setIsRefreshing(false);
    };

    const handleConnect = async (walletName?: string) => {
        setShowWalletSelector(false);
        await connect(walletName);
    };

    onMount(() => {
        const interval = setInterval(() => {
            if (state.isConnected) {
                refreshBalances();
            }
        }, 30000); // Refresh balances every 30s
        return () => clearInterval(interval);
    });

    return (
        <div class="flex flex-col h-full w-full">
            {/* Tab navigation */}
            <div class="flex justify-center">
                <button class="px-4 py-2 text-sm" classList={{ 'active': selectedTab() === 'overview' }} onClick={() => setSelectedTab('overview')}>Overview</button>
                <button class="px-4 py-2 text-sm" classList={{ 'active': selectedTab() === 'activity' }} onClick={() => setSelectedTab('activity')}>Activity</button>
                <button class="px-4 py-2 text-sm" classList={{ 'active': selectedTab() === 'settings' }} onClick={() => setSelectedTab('settings')}>Settings</button>
            </div>

            {/* Content area */}
            <div class="flex-1 overflow-auto p-2">
                {/* --- Connected State --- */}
                <Show when={state.isConnected}>
                    <>
                        {/* Overview Tab */}
                        <Show when={selectedTab() === 'overview'}>
                            <div class="window w-full">
                                <div class="title-bar"><div class="title-bar-text">Account Overview</div></div>
                                <div class="window-body p-3">
                                    {/* Address */}
                                    <div class="flex items-center mb-3">
                                        <div class="font-bold mr-2 w-16 text-sm">Address:</div>
                                        <div class="status-bar-field px-2 flex-1 truncate text-sm">{state.activeAccount?.address}</div>
                                        <button class="ml-2 px-2 text-xs" title="Copy address" onClick={() => state.activeAccount && navigator.clipboard.writeText(state.activeAccount.address)}>Copy</button>
                                    </div>
                                    {/* Balances */}
                                    <div class="my-4">
                                        <div class="font-bold mb-2 text-sm">Balances:</div>
                                        <For each={state.balances} fallback={<div class="text-sm italic ml-2">No balances found.</div>}>
                                            {balance => (<div class="status-bar-field flex justify-between px-2 py-1 mb-1 text-sm"><span>{balance.symbol}</span><span>{(parseInt(balance.balance) / Math.pow(10, balance.decimals)).toFixed(4)}</span></div>)}
                                        </For>
                                    </div>
                                    {/* Collections */}
                                    <div class="my-4">
                                        <div class="font-bold mb-2 text-sm">Collections:</div>
                                        <div class="space-y-1">
                                            <button
                                                class="status-bar-field flex w-full justify-between px-2 py-1 mb-1 text-sm cursor-pointer hover:bg-gray-200"
                                                onClick={() => launchProgramByLabel('Minting Lab')}
                                                title="Open Minting Lab"
                                            >
                                                <span>Encrypted Drives</span>
                                                <span>{state.collections.encryptedDrives}</span>
                                            </button>
                                            <button
                                                class="status-bar-field flex w-full justify-between px-2 py-1 mb-1 text-sm cursor-pointer hover:bg-gray-200"
                                                onClick={() => launchProgramByLabel('Program Viewer')}
                                                title="Open Program Viewer"
                                            >
                                                <span>Programs</span>
                                                <span>{state.collections.decryptedPrograms}</span>
                                            </button>
                                        </div>
                                    </div>
                                    {/* Buttons */}
                                    <div class="flex justify-end mt-4">
                                        <button onClick={handleRefreshAll} disabled={isRefreshing() || state.isHistoryLoading}>
                                            {isRefreshing() || state.isHistoryLoading ? 'Refreshing...' : 'Refresh All'}
                                        </button>
                                        <button onClick={() => disconnect()} class="ml-2">Disconnect</button>
                                    </div>
                                </div>
                            </div>
                        </Show>

                        {/* Activity Tab */}
                        <Show when={selectedTab() === 'activity'}>
                            <div class="window w-full">
                                <div class="title-bar"><div class="title-bar-text">Recent Activity</div></div>
                                <div class="window-body p-3">
                                    {/* Loading State */}
                                    <Show when={state.isHistoryLoading}>
                                        <div class="text-center p-4 text-sm italic">Loading history...</div>
                                    </Show>
                                    {/* Error State */}
                                    <Show when={!state.isHistoryLoading && state.historyError}>
                                        <div class="text-center p-4 text-sm text-red-600">Error loading history: {state.historyError}</div>
                                    </Show>
                                    {/* Empty State */}
                                    <Show when={!state.isHistoryLoading && !state.historyError && state.transactionHistory.length === 0}>
                                        <div class="text-center p-4 text-sm italic">No recent transactions found where you were the sender.</div>
                                    </Show>
                                    {/* Transaction List */}
                                    <Show when={!state.isHistoryLoading && !state.historyError && state.transactionHistory.length > 0}>
                                        <ul class="list-none p-0 m-0">
                                            <For each={state.transactionHistory}>
                                                {(tx) => (
                                                    <li class="border-b border-gray-300 py-2 px-1 text-sm mb-1 hover:bg-gray-100">
                                                        <div class="flex justify-between items-center mb-1">
                                                            <a href={getExplorerLink(state.network, tx.digest)} target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline truncate font-mono text-xs" title={tx.digest}>
                                                                {truncateAddress(tx.digest, 8)}
                                                            </a>
                                                            <span class="text-xs font-semibold px-2 py-0.5 rounded" classList={{ 'bg-green-200 text-green-800': tx.effects?.status?.status === 'success', 'bg-red-200 text-red-800': tx.effects?.status?.status !== 'success' }}>
                                                                {tx.effects?.status?.status === 'success' ? 'Success' : 'Failure'}
                                                            </span>
                                                        </div>
                                                        <div class="flex justify-between items-center text-xs text-gray-600">
                                                            <span class="truncate pr-2" title={getTransactionSummary(tx)}>{getTransactionSummary(tx)}</span>
                                                            <span>{formatTimestamp(tx.timestampMs ? tx.timestampMs : "")}</span>
                                                        </div>
                                                        <Show when={tx.effects?.status?.status !== 'success'}>
                                                            <div class="text-xs text-red-500 mt-1 truncate">
                                                                Error: {tx.effects?.status?.error || 'Unknown'}
                                                            </div>
                                                        </Show>
                                                    </li>
                                                )}
                                            </For>
                                        </ul>
                                    </Show>
                                    {/* Refresh Button */}
                                    <div class="flex justify-end mt-3">
                                        <button onClick={() => fetchTransactionHistory({ force: true })} disabled={state.isHistoryLoading}>
                                            {state.isHistoryLoading ? 'Refreshing...' : 'Refresh History'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Show>

                        {/* Settings Tab */}
                        <Show when={selectedTab() === 'settings'}>
                            <div class="window w-full">
                                <div class="title-bar"><div class="title-bar-text">Wallet Settings</div></div>
                                <div class="window-body p-3">
                                    <div class="mb-4">
                                        <label class="block mb-1 text-sm font-semibold">Network</label>
                                        <select class="flex w-full h-[26px] p-1 border items-center" value={state.network} onChange={(e) => { switchNetwork(e.target.value as NetworkType); }}>
                                            <option value="mainnet">Mainnet</option>
                                            <option value="testnet">Testnet</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </Show>
                    </>
                </Show>

                {/* --- Not Connected State --- */}
                <Show when={!state.isConnected}>
                    <div class="flex flex-col items-center justify-center h-full">
                        <div class="window w-80">
                            <div class="title-bar"><div class="title-bar-text">Connect Wallet</div></div>
                            <div class="window-body p-4 text-center">
                                <p class="mb-4">Connect your wallet to manage assets and activity.</p>
                                <Show when={state.error}><div class="mb-4 p-2 bg-red-100 text-red-800 text-sm">{state.error}</div></Show>
                                {/* Wallet Selection Logic */}
                                <Show when={!showWalletSelector() && state.availableWallets.length > 0}>
                                    <button class="px-4 py-2 w-full mb-2" onClick={() => setShowWalletSelector(true)}>Select Wallet</button>
                                </Show>
                                <Show when={showWalletSelector()}>
                                    <div class="window border mb-4">
                                        <div class="title-bar"><div class="title-bar-text">Available Wallets</div></div>
                                        <div class="window-body p-2">
                                            <For each={state.availableWallets}>
                                                {wallet => (
                                                    <button
                                                        class="w-full mb-1 p-1 flex items-center justify-between text-left hover:bg-gray-200 text-sm"
                                                        onClick={() => handleConnect(wallet.name)}
                                                        disabled={state.isConnecting || wallet.name.toLowerCase() !== "slush"}
                                                    >
                                                        <span class="flex items-center">
                                                            <img src={wallet.icon} alt={wallet.name} class="w-5 h-5 mr-2 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                                            {wallet.name}
                                                        </span>
                                                        <span>{state.isConnecting ? '...' : wallet.name.toLowerCase() === "slush" ? '→' : '✕'}</span>
                                                    </button>
                                                )}
                                            </For>
                                            <button class="text-xs mt-2" onClick={() => setShowWalletSelector(false)}>Cancel</button>
                                        </div>
                                    </div>
                                </Show>
                                <Show when={state.availableWallets.length === 0}>
                                    <div class="mb-4 p-2 bg-yellow-100 text-yellow-800 text-sm">No compatible wallets detected. Please install a Sui wallet extension.</div>
                                    <a href="https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil" target="_blank" class="text-blue-600 underline text-sm">Get Sui Wallet</a>
                                </Show>
                            </div>
                        </div>
                    </div>
                </Show>
            </div>

            {/* Status bar */}
            <div class="status-bar mt-auto">
                <div class="status-bar-field">{state.isConnected && state.activeAccount ? `Connected: ${truncateAddress(state.activeAccount.address, 8)}` : 'Not connected'}</div>
                <div class="status-bar-field">{state.isConnected && state.balances.length > 0 ? `${(parseInt(state.balances[0].balance) / Math.pow(10, state.balances[0].decimals)).toFixed(4)} ${state.balances[0].symbol}` : ''}</div>
                <div class="status-bar-field">Network: {state.network.charAt(0).toUpperCase() + state.network.slice(1)}</div>
            </div>
        </div>
    );
}