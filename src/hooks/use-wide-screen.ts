import { useWindowDimensions } from 'react-native';

export const WIDE_SCREEN_MIN_WIDTH = 700;

export function useIsWideScreen(): boolean {
  const { width } = useWindowDimensions();

  return width >= WIDE_SCREEN_MIN_WIDTH;
}
