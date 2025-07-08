import type { Component } from "solid-js";

interface DesktopIconProps {
  appName: string;
  appIcon: string;
  program: Component;
  onLaunch: () => void;
}

export default function DesktopIcon(props: DesktopIconProps) {
  return (
    <div
      class="flex flex-col items-center w-20 bg-transparent border-none cursor-pointer hover:bg-blue-500 hover:bg-opacity-30 p-2 focus:outline-none focus:bg-blue-500 focus:bg-opacity-30"
      onClick={props.onLaunch}
      title={props.appName}
    >
      <img
        src={props.appIcon}
        alt={props.appName}
        class="w-8 h-8 mb-1 select-none"
        draggable={false}
      />
      <span class="text-white text-center text-sm break-words w-full select-none">
        {props.appName}
      </span>
    </div>
  );
}

