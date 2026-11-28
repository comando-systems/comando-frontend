import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, useWindowDimensions } from 'react-native';

import { Field } from '@/components/field';
import { layout } from '@/theme';

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

describe('<Field />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWidth(800);
  });

  it('renders the label, input, and helper text', async () => {
    await render(<Field label="Código da mesa" testID="table-input" helper="Use o código impresso." />);

    expect(screen.getByText('Código da mesa')).toBeTruthy();
    expect(screen.getByTestId('table-input')).toBeTruthy();
    expect(screen.getByText('Use o código impresso.')).toBeTruthy();
  });

  it('shows validation errors instead of helper text', async () => {
    await render(
      <Field
        label="Código da mesa"
        testID="table-input"
        helper="Use o código impresso."
        error="Obrigatório."
      />,
    );

    expect(screen.getByText('Obrigatório.')).toBeTruthy();
    expect(screen.queryByText('Use o código impresso.')).toBeNull();
  });

  it('renders an optional leading icon', async () => {
    await render(<Field label="Buscar mesas" testID="table-search" icon="search" />);

    expect(screen.getByTestId('field-icon')).toBeTruthy();
    expect(screen.getByTestId('table-search')).toBeTruthy();
  });

  it('forwards text changes', async () => {
    const onChangeText = jest.fn();
    await render(<Field label="Table code" testID="table-input" onChangeText={onChangeText} />);

    await fireEvent.changeText(screen.getByTestId('table-input'), 'T-01');

    expect(onChangeText).toHaveBeenCalledWith('T-01');
  });

  it('caps the field width on wide screens', async () => {
    await render(<Field label="Código da mesa" testID="table-input" />);

    expect(StyleSheet.flatten(screen.getByText('Código da mesa').parent?.props.style)).toEqual(
      expect.objectContaining({ maxWidth: layout.formMaxWidth, width: '100%' }),
    );
  });

  it('uses the full available width on narrow screens', async () => {
    mockWidth(699);
    await render(<Field label="Código da mesa" testID="table-input" />);

    expect(StyleSheet.flatten(screen.getByText('Código da mesa').parent?.props.style)).toEqual(
      expect.objectContaining({ width: '100%' }),
    );
    expect(
      StyleSheet.flatten(screen.getByText('Código da mesa').parent?.props.style).maxWidth,
    ).toBeUndefined();
  });
});
