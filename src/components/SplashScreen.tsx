import { createSignal, onMount, Show, For, createMemo } from 'solid-js';
import type { Component } from 'solid-js';
import styles from './SplashScreen.module.css';
import { preloadAllAssets, type AssetStatus } from '../utils/assetPreloader';

const ASCII_LOGO = [
    "██████╗  █████╗ ███████╗███╗   ███╗ ██████╗ ███╗   ██╗",
    "██╔══██╗██╔══██╗██╔════╝████╗ ████║██╔═══██╗████╗  ██║",
    "██║  ██║███████║█████╗  ██╔████╔██║██║   ██║██╔██╗ ██║",
    "██║  ██║██╔══██║██╔══╝  ██║╚██╔╝██║██║   ██║██║╚██╗██║",
    "██████╔╝██║  ██║███████╗██║ ╚═╝ ██║╚██████╔╝██║ ╚████║",
    "╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═══╝"
];

interface SplashScreenProps {
    onLoaded: () => void;
}

interface DisplayMessage {
    id: number;
    text: string;
    timestamp: number;
    isError?: boolean;
}

const MAX_VISIBLE_MESSAGES = 7;

const SplashScreen: Component<SplashScreenProps> = (props) => {
    const [isVisible, setIsVisible] = createSignal(true);
    const [fadeOut, setFadeOut] = createSignal(false);
    const [statusMessages, setStatusMessages] = createSignal<DisplayMessage[]>([]);
    const [revealedLines, setRevealedLines] = createSignal<boolean[]>(new Array(ASCII_LOGO.length).fill(false));

    const visibleItemsData = () => {
        const items = statusMessages().slice(-MAX_VISIBLE_MESSAGES);
        return { items: items, size: items.length };
    };

    onMount(() => {
        const initialMessages: DisplayMessage[] = [
            { id: Date.now() + 1, text: 'System Booting...', timestamp: Date.now() },
            { id: Date.now() + 2, text: 'Initializing Daemon OS Kernel...', timestamp: Date.now() },
        ];
        setStatusMessages(initialMessages);

        let currentLineIndex = 0;
        const lineRevealInterval = setInterval(() => {
            if (currentLineIndex < revealedLines().length) {
                setRevealedLines(prev => {
                    const next = [...prev];
                    next[currentLineIndex] = true;
                    return next;
                });
                currentLineIndex++;
            } else {
                clearInterval(lineRevealInterval);
            }
        }, 300);

        preloadAllAssets((status: AssetStatus) => {
            setStatusMessages(prev => [
                ...prev,
                {
                    id: Date.now() + prev.length,
                    text: status.message,
                    timestamp: Date.now(),
                    isError: status.error
                }
            ]);
        }).then(() => {
            const allLinesRevealed = revealedLines().every(line => line);
            const timeToWait = allLinesRevealed ? 1500 : (revealedLines().length - currentLineIndex) * 300 + 1500;

            setStatusMessages(prev => [
                ...prev,
                { id: Date.now() + prev.length, text: 'System Online. Welcome to Daemon OS.', timestamp: Date.now() }
            ]);

            setTimeout(() => {
                setFadeOut(true);
                setTimeout(() => {
                    props.onLoaded();
                    setIsVisible(false);
                }, 1000);
            }, timeToWait);
        }).catch(error => {
            console.error("Critical asset preloading failed:", error);
            setStatusMessages(prev => [
                ...prev,
                { id: Date.now(), text: `CRITICAL ERROR: ${error.message}. Attempting to continue...`, timestamp: Date.now(), isError: true }
            ]);
            setTimeout(() => {
                setFadeOut(true);
                setTimeout(() => {
                    props.onLoaded();
                    setIsVisible(false);
                }, 1000);
            }, 1500);
        });
    });

    const LogoDisplay = () => (
        <div class="whitespace-pre text-xs sm:text-sm md:text-base leading-tight sm:leading-tight md:leading-normal mb-4 font-mono text-[#4604ec]">
            {ASCII_LOGO.map((line, index) => (
                <div
                    class="transition-opacity duration-300 ease-in-out"
                    style={{ opacity: revealedLines()[index] ? 1 : 0 }}
                >
                    {line}
                </div>
            ))}
        </div>
    );

    return (
        <Show when={isVisible()}>
            <div
                class={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#4604ec] to-[#9a5cff] text-white font-mono p-4 ${styles.crtEffect} ${fadeOut() ? styles.fadeOut : ''}`}
            >
                <div class="flex flex-col items-center text-center bg-transparent">
                    <LogoDisplay />
                    <p class="text-sm text-[#4604ec] mt-2">Daemon OS v0.1</p>
                </div>

                <div class="fixed bottom-0 left-0 w-full p-4 overflow-hidden h-48" style="z-index: 3;">
                    <div class="flex flex-col justify-end h-full">
                        <For each={visibleItemsData().items}>
                            {(message, indexSignal) => {
                                const itemData = createMemo(() => {
                                    const displayIndex = indexSignal();
                                    const totalDisplayed = visibleItemsData().size;
                                    let calculatedAlpha = 1.0;
                                    if (totalDisplayed > 0) {
                                        const baseRatio = (displayIndex + 1) / totalDisplayed;
                                        calculatedAlpha = Math.max(0.05, Math.min(1, Math.pow(baseRatio, 1.5)));
                                    }
                                    const transformOffset = totalDisplayed > 0 ? totalDisplayed - 1 - displayIndex : 0;
                                    return {
                                        alpha: calculatedAlpha,
                                        position: transformOffset,
                                    };
                                });

                                return (
                                    <div
                                        class="font-bold text-sm mb-1 flex items-center"
                                        style={{
                                            transform: `translateY(-${itemData().position * 4}px)`,
                                            color: message.isError ? 'rgba(255, 100, 100, ${itemData().alpha})' : `rgba(255, 255, 255, ${itemData().alpha})`
                                        }}
                                    >
                                        <span class="mr-2" style={{ color: message.isError ? 'rgba(255, 100, 100, ${itemData().alpha})' : `rgba(13, 253, 247, ${itemData().alpha})` }}>
                                            &gt;
                                        </span>
                                        <span>
                                            {message.text}
                                        </span>
                                    </div>
                                );
                            }}
                        </For>
                    </div>
                </div>
            </div>
        </Show>
    );
};

export default SplashScreen; 