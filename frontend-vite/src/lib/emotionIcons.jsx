import { Smile, Frown, Angry, AlertTriangle, Meh, Music } from 'lucide-react';

export const emotionIcons = {
  Smile,
  Frown,
  Angry,
  AlertTriangle,
  Meh,
  Music,
};

export const getEmotionIcon = (iconName, props = {}) => {
  const Icon = emotionIcons[iconName] || Music;
  return <Icon {...props} />;
};

export const emotionConfig = {
  joyeux: { icon: 'Smile', color: '#1db954', label: 'Joyeux' },
  triste: { icon: 'Frown', color: '#2d46b9', label: 'Triste' },
  colère: { icon: 'Angry', color: '#e13300', label: 'Colère' },
  peur: { icon: 'AlertTriangle', color: '#8e44ad', label: 'Peur' },
  neutre: { icon: 'Meh', color: '#535353', label: 'Neutre' },
  instrumental: { icon: 'Music', color: '#ff6600', label: 'Instrumental' },
};
