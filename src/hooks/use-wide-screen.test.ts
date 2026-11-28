import { renderHook } from '@testing-library/react-native';
import { useWindowDimensions } from 'react-native';

import { useIsWideScreen } from '@/hooks/use-wide-screen';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(),
}));

function mockWidth(width: number) {
  jest.mocked(useWindowDimensions).mockReturnValue({
    width,
    height: 800,
    scale: 1,
    fontScale: 1,
  });
}

describe('useIsWideScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false below the breakpoint', async () => {
    mockWidth(699);
    const { result } = await renderHook(() => useIsWideScreen());

    expect(result.current).toBe(false);
  });

  it('returns true at the breakpoint and above', async () => {
    mockWidth(700);
    const { result, rerender } = await renderHook(() => useIsWideScreen());

    expect(result.current).toBe(true);

    mockWidth(1024);
    rerender({});

    expect(result.current).toBe(true);
  });
});
