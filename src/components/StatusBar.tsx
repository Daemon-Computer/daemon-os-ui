interface StatusBarProps {
  label: string;
  value: number;
  maxValue: number;
  backgroundColor?: string;
  fillColor?: string;
  textColor?: string;
  borderColor?: string;
  showUnits?: boolean;
  unitSize?: number;
}

function getContrastColor(backgroundColor: string): string {
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
}

export default function StatusBar(props: StatusBarProps) {
  const fillPercentage = Math.min((props.value / props.maxValue) * 100, 100);
  const textColor = props.textColor || getContrastColor(props.backgroundColor || '#c0c0c0');
  const borderColor = props.borderColor || textColor;
  
  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '2px',
    fontFamily: "'Pixelated MS Sans Serif', Arial",
    fontSize: '11px',
  };

  const labelStyle = {
    color: textColor,
    minWidth: '60px',
    textAlign: 'right' as const,
    marginRight: '8px',
    fontWeight: 'bold',
  };

  const barContainerStyle = {
    flex: 1,
    height: '14px',
    border: `1px solid ${borderColor}`,
    backgroundColor: '#000000',
    position: 'relative' as const,
    boxShadow: 'inset 1px 1px 0px rgba(0,0,0,0.8), inset -1px -1px 0px rgba(255,255,255,0.3)',
  };

  const fillStyle = {
    height: '100%',
    width: `${fillPercentage}%`,
    backgroundColor: props.fillColor || '#ffff00',
    transition: 'width 0.2s ease',
  };

  const renderSegmentedBar = () => {
    if (!props.showUnits) {
      return <div style={fillStyle}></div>;
    }

    const unitSize = props.unitSize || 8;
    const totalUnits = Math.floor(props.maxValue / unitSize);
    const filledUnits = Math.floor(props.value / unitSize);
    
    const segmentsContainerStyle = {
      display: 'flex',
      height: '100%',
      width: '100%',
    };

    const segments = [];
    for (let i = 0; i < totalUnits; i++) {
      const isFilled = i < filledUnits;
      const segmentStyle = {
        flex: 1,
        height: '100%',
        backgroundColor: isFilled ? (props.fillColor || '#ffff00') : 'transparent',
        borderRight: i < totalUnits - 1 ? `1px solid ${borderColor}` : 'none',
      };
      
      segments.push(
        <div key={i} style={segmentStyle}></div>
      );
    }
    
    return <div style={segmentsContainerStyle}>{segments}</div>;
  };

  return (
    <div style={containerStyle}>
      <div style={labelStyle}>
        {props.label}
      </div>
      <div style={barContainerStyle}>
        {renderSegmentedBar()}
      </div>
    </div>
  );
}