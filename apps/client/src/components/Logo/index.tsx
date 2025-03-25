interface LogoProps {
    size: 'small' | 'medium' | 'large'
    className?: string
}

// 导入 logo 图片
import logoImage from '@/assets/logo-site.png';

export const Logo: React.FC<LogoProps> = ({
    size = 'medium',
    className
}) => {
    // TODO：Tailwind 类名未生效，使用 style 属性替代
    const sizeValues = {
        small: { width: '70px' },
        medium: { width: '135px' },
        large: { width: '150px' }
    }
    
    return (
        <img 
            src={logoImage} 
            alt="logo" 
            className={className}
            style={{
                ...sizeValues[size],
                filter: 'drop-shadow(0 0 1px white)'
            }} 
        />
    )
};

