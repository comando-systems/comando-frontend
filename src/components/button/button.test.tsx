import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, useWindowDimensions } from 'react-native';

import { Button } from '@/components/button';
import { colors, layout } from '@/theme';

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

describe('<Button />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWidth(800);
  });

  it('renders its label and icon', async () => {
    await render(<Button label="Salvar" onPress={jest.fn()} icon="save" />);

    expect(screen.getByText('Salvar')).toBeTruthy();
    expect(screen.getByTestId('button-icon')).toBeTruthy();
  });

  it('calls onPress when enabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="Continuar" onPress={onPress} />);

    await fireEvent.press(screen.getByTestId('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress while disabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="Continuar" onPress={onPress} disabled />);

    await fireEvent.press(screen.getByTestId('button'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows a spinner and blocks presses while loading', async () => {
    const onPress = jest.fn();
    await render(<Button label="Continuar" onPress={onPress} loading />);

    expect(screen.getByTestId('button-spinner')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('button'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('caps full-width buttons at the shared width token on wide screens', async () => {
    await render(<Button label="Continuar" onPress={jest.fn()} fullWidth />);

    expect(StyleSheet.flatten(screen.getByTestId('button').props.style)).toEqual(
      expect.objectContaining({ maxWidth: layout.formMaxWidth, width: '100%' }),
    );
  });

  it('lets full-width buttons use the full width on narrow screens', async () => {
    mockWidth(699);
    await render(<Button label="Continuar" onPress={jest.fn()} fullWidth />);

    const style = StyleSheet.flatten(screen.getByTestId('button').props.style);

    expect(style).toEqual(expect.objectContaining({ width: '100%' }));
    expect(style.maxWidth).toBeUndefined();
  });

  it('renders secondary and tertiary variants without a filled background', async () => {
    const { unmount } = await render(
      <Button label="Secundário" onPress={jest.fn()} variant="secondary" />,
    );

    expect(StyleSheet.flatten(screen.getByTestId('button').props.style)).toEqual(
      expect.objectContaining({ backgroundColor: 'transparent', borderColor: colors.primary }),
    );

    unmount();
    await render(<Button label="Terciário" onPress={jest.fn()} variant="tertiary" />);

    expect(StyleSheet.flatten(screen.getByTestId('button').props.style)).toEqual(
      expect.objectContaining({ backgroundColor: 'transparent', borderColor: 'transparent' }),
    );
  });
});
