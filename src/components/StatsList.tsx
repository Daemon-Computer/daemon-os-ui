interface StatRowProps {
  label: string;
  value: string | number;
}

function StatRow(props: StatRowProps) {
  return (
    <li class="flex items-center justify-between status-bar-field mb-px px-1">
      <span class="whitespace-nowrap">{props.label}</span>
      <span class="whitespace-nowrap font-mono">{props.value}</span>
    </li>
  );
}

interface StatsListProps {
  program: {
    speed: number;
    corruption: number;
    health: number;
    maxHealth: number;
    damage: number;
  };
}

export default function StatsList(props: StatsListProps) {
  return (
    <div class="w-full">
      <div class="font-bold mb-1">Stats</div>
      <ul class="list-none p-0 m-0">
        <StatRow label="Speed" value={`${props.program.speed} tiles`} />
        <StatRow label="Corruption" value={`${props.program.corruption}%`} />
        <StatRow label="Health" value={`${props.program.health}/${props.program.maxHealth}`} />
        <StatRow label="Damage" value={`${props.program.damage}`} />
      </ul>
    </div>
  );
}
