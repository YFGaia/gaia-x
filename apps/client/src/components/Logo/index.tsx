import { useSettingStore } from '@/stores/SettingStore';

interface LogoProps {
  size: 'tiny' | 'small' | 'medium' | 'large'
  className?: string
}

// 导入 logo 图片
import logoImage from '@/assets/gaia-logo-light.png';
import logoImageDark from '@/assets/gaia-logo-dark.png';

export const Logo: React.FC<LogoProps> = ({
  size = 'medium',
  className
}) => {
  // Get current theme from settings store
  const theme = useSettingStore((state) => state.settings['app.theme']);

  // Size values with proper aspect ratio maintained
  const sizeValues = {
    tiny: { width: '48px', height: '48px' },
    small: { width: '70px', height: '70px' },
    medium: { width: '135px', height: 'auto' },
    large: { width: '150px', height: 'auto' }
  }

  // Choose logo based on theme
  const currentLogo = theme === 'dark' ? logoImageDark : logoImage;

  return (
    <img
      src={currentLogo}
      alt="logo"
      className={className}
      style={{
        ...sizeValues[size],
        objectFit: 'contain',
        userSelect: 'none',
        pointerEvents: 'none'
      }}
    />
  )
};

