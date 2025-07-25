interface Program {
  id: string;
  name: string;
  speed: number;
  corruption: number;
  maxHealth: number;
  health: number;
  damage: number;
  viewModel: {
    palette: {
      primary: [number, number, number];
      secondary: [number, number, number];
      tertiary: [number, number, number];
      highlight: [number, number, number];
      accent: [number, number, number];
    };
  };
}

interface RetroGameCardProps {
  program: Program | null;
  canvasElement?: any;
}

const COMPONENT_ICONS = ['🔧', '⚙️', '🔩', '⚡', '🛡️', '🎯'];

export default function RetroGameCard(props: RetroGameCardProps) {
  const getProgramName = (): string => {
    if (!props.program) return 'Yoshiro Kenda';
    return props.program.name || 'Unknown Program';
  };

  const calculateJump = (): number => {
    if (!props.program) return 0;
    return Math.floor(props.program.speed * 15 + props.program.health / 10);
  };

  const calculateStamina = (): number => {
    if (!props.program) return 0;
    return Math.floor(props.program.maxHealth * 0.8 + (100 - props.program.corruption));
  };

  if (props.canvasElement !== null) {
    return (
      <div
        style={{
          'background-color': '#c0c0c0',
          color: '#000000',
          border: '2px solid #000000',
          'box-shadow': 'inset -2px -2px 0px #000000, inset 2px 2px 0px #000000',
          'font-family': "'Pixelated MS Sans Serif', Arial",
          'font-size': '11px',
          padding: '8px',
          width: '100%',
          height: '100%',
          display: 'flex',
          'flex-direction': 'column',
          gap: '6px',
          overflow: 'hidden',
        }}
      >
        {/* Canvas content when canvasElement is provided */}
        <div style={{ width: '100%', height: '100%', display: 'flex' }}>{props.canvasElement}</div>
      </div>
    );
  }

  return (
    <div
      style={{
        'background-color': 'transparent',
        color: '#000000',
        'font-family': "'Pixelated MS Sans Serif', monospace",
        'font-size': '14px',
        width: '100%',
        height: '100%',
        display: 'flex',
        'flex-direction': 'column',
        gap: '12px',
      }}
    >
      {/* NAME Section */}
      <div
        style={{
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center',
          'font-size': '14px',
          'font-weight': 'bold',
        }}
      >
        <span>NAME</span>
        <span style={{ 'font-weight': 'normal' }}>{getProgramName()}</span>
      </div>

      {/* Stats Bars - Vertical Layout */}
      <div
        style={{
          display: 'flex',
          'flex-direction': 'column',
          gap: '8px',
          width: '100%',
        }}
      >
        {/* SPEED */}
        <div
          style={{
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center',
          }}
        >
          <span style={{ 'font-weight': 'bold', 'min-width': '80px' }}>SPEED</span>
          <div
            style={{
              flex: '1',
              height: '16px',
              'background-color': '#333333',
              border: '1px solid #000000',
              'margin-left': '16px',
              position: 'relative',
              display: 'flex',
            }}
          >
            {Array.from({ length: 20 }, (_, i) => (
              <div
                style={{
                  flex: '1',
                  height: '100%',
                  'background-color':
                    i < (props.program?.speed || 0) * 2 ? '#ffff00' : 'transparent',
                  'border-right': i < 19 ? '1px solid #000000' : 'none',
                }}
              />
            ))}
          </div>
        </div>

        {/* POWER */}
        <div
          style={{
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center',
          }}
        >
          <span style={{ 'font-weight': 'bold', 'min-width': '80px' }}>POWER</span>
          <div
            style={{
              flex: '1',
              height: '16px',
              'background-color': '#333333',
              border: '1px solid #000000',
              'margin-left': '16px',
              position: 'relative',
              display: 'flex',
            }}
          >
            {Array.from({ length: 20 }, (_, i) => (
              <div
                style={{
                  flex: '1',
                  height: '100%',
                  'background-color':
                    i < (props.program?.damage || 0) / 2.5 ? '#ffff00' : 'transparent',
                  'border-right': i < 19 ? '1px solid #000000' : 'none',
                }}
              />
            ))}
          </div>
        </div>

        {/* HEALTH */}
        <div
          style={{
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center',
          }}
        >
          <span style={{ 'font-weight': 'bold', 'min-width': '80px' }}>HEALTH</span>
          <div
            style={{
              flex: '1',
              height: '16px',
              'background-color': '#333333',
              border: '1px solid #000000',
              'margin-left': '16px',
              position: 'relative',
              display: 'flex',
            }}
          >
            {Array.from({ length: 20 }, (_, i) => (
              <div
                style={{
                  flex: '1',
                  height: '100%',
                  'background-color':
                    i < (props.program?.health || 0) / 5 ? '#ffff00' : 'transparent',
                  'border-right': i < 19 ? '1px solid #000000' : 'none',
                }}
              />
            ))}
          </div>
        </div>

        {/* JUMP */}
        <div
          style={{
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center',
          }}
        >
          <span style={{ 'font-weight': 'bold', 'min-width': '80px' }}>JUMP</span>
          <div
            style={{
              flex: '1',
              height: '16px',
              'background-color': '#333333',
              border: '1px solid #000000',
              'margin-left': '16px',
              position: 'relative',
              display: 'flex',
            }}
          >
            {Array.from({ length: 20 }, (_, i) => (
              <div
                style={{
                  flex: '1',
                  height: '100%',
                  'background-color': i < calculateJump() / 10 ? '#ffff00' : 'transparent',
                  'border-right': i < 19 ? '1px solid #000000' : 'none',
                }}
              />
            ))}
          </div>
        </div>

        {/* STAMINA */}
        <div
          style={{
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center',
          }}
        >
          <span style={{ 'font-weight': 'bold', 'min-width': '80px' }}>STAMINA</span>
          <div
            style={{
              flex: '1',
              height: '16px',
              'background-color': '#333333',
              border: '1px solid #000000',
              'margin-left': '16px',
              position: 'relative',
              display: 'flex',
            }}
          >
            {Array.from({ length: 20 }, (_, i) => (
              <div
                style={{
                  flex: '1',
                  height: '100%',
                  'background-color': i < calculateStamina() / 10 ? '#ffff00' : 'transparent',
                  'border-right': i < 19 ? '1px solid #000000' : 'none',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
