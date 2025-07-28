import type { JSXElement } from 'solid-js';

interface TitledContainerProps {
  title: string;
  children: JSXElement;
  class?: string;
}

export default function TitledContainer(props: TitledContainerProps) {
  return (
    <div class={`border-2 border-white flex flex-col relative ${props.class} m-2 mt-[18px]`}>
      <div class="uppercase text-red-500 font-mono font-bold text-xl px-2 py-1 absolute -top-5 bg-[#b0a9e4]">
        {props.title}
      </div>
      <div class="flex-1 mt-4 m-2 overflow-hidden">{props.children}</div>
    </div>
  );
}
