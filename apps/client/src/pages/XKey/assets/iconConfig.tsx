import * as RiIcons from 'react-icons/ri';
import { IconType } from 'react-icons';

// Get all icon names and create iconConfig dynamically
const iconConfig: Record<string, IconType> = Object.keys(RiIcons)
  .filter(key => key.startsWith('Ri') && typeof RiIcons[key as keyof typeof RiIcons] === 'function')
  .reduce((acc, iconName) => ({
    ...acc,
    [iconName]: RiIcons[iconName as keyof typeof RiIcons]
  }), {});

export const getIcon = (iconName: string) => {
  const IconComponent = iconConfig[iconName];
  if (!IconComponent) {
    console.warn(`Icon "${iconName}" does not exist in the iconConfig.`);
    return <RiIcons.RiBox1Line />; // Return a default icon
  }
  return <IconComponent />;
};
