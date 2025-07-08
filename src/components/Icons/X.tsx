interface XProps {
    className?: string;
}

export default function X(_props: XProps) {
      const props = mergeProps({ className: "" }, _props);
return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width={1.5} stroke="currentColor" class={`size-6 text-[#0c046f] ${props.className}`}>
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>;
}