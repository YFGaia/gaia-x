import { useSettingStore } from '@/stores/SettingStore';
import { createStyles } from 'antd-style';

interface McpLogoProps {
  size?: number;
  className?: string;
}

import mcpLogoLight from '@/assets/mcp-logo-light.svg';
import mcpLogoDark from '@/assets/mcp-logo-dark.svg';

const useStyles = createStyles(({ css }) => ({
  logoWrapper: css`
    display: inline-block;
    transition: filter 0.3s ease;
    &:hover {
      filter: brightness(0) saturate(100%) invert(36%) sepia(73%) saturate(845%) hue-rotate(188deg) brightness(98%) contrast(98%);
    }
  `
}));

export const McpLogo: React.FC<McpLogoProps> = ({
  size = 16,
  className
}) => {
  const { styles } = useStyles();
  // Get current theme from settings store
  const theme = useSettingStore((state) => state.settings['app.theme']);

  // Choose logo based on theme
  const currentLogo = theme === 'dark' ? mcpLogoDark : mcpLogoLight;

  return (
    <div className={styles.logoWrapper}>
      <img
        src={currentLogo}
        alt="MCP Logo"
        className={className}
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          userSelect: 'none',
          pointerEvents: 'none'
        }}
      />
    </div>
  )
}; 