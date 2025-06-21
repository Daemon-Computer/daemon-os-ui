import { JSXElement } from 'solid-js';

interface DesktopGridProps {
  children: JSXElement;
}

export default function DesktopGrid(props: DesktopGridProps) {
  return (
    <div
      class={`
        grid gap-4
        grid-cols-3
        sm:grid-cols-4
        lg:grid-cols-6
        xl:grid-cols-12
        auto-rows-min
        justify-items-center
        relative
        z-0
        py-4
      `}
    >
      {props.children}
    </div>
  );
}
