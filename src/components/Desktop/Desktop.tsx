import { JSXElement } from 'solid-js';
import Taskbar from '../Desktop/Taskbar';
import { usePrograms } from '../ProgramWindow/programContext';

interface DesktopProps {
    children: JSXElement;
}

export default function Desktop(props: DesktopProps) {
    const { activePrograms } = usePrograms();

    return (
        <div class="fixed inset-0 bg-teal-600 overflow-hidden flex flex-col">
            {/* Desktop icons grid area */}
            <div class="flex-1 overflow-auto">
                {props.children}
            </div>

            {/* Daemon title watermark */}
            <div class="fixed -top-28 -right-12 z-[9999] pointer-events-none select-none">
                <img
                    src="/icons/daemon-title.avif"
                    alt="DAEMON Watermark"
                    class="opacity-75 w-64"
                />
            </div>
            <Taskbar />
        </div>
    );
}