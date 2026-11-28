import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Form } from '@/components/form';
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

describe('<Form />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWidth(800);
  });

  it('renders its children and a submit action', async () => {
    const onSubmit = jest.fn();
    await render(
      <Form submit="Confirmar" onSubmit={onSubmit}>
        <FormChild />
      </Form>,
    );

    expect(screen.getByTestId('form-child')).toBeTruthy();
    expect(screen.getByText('Confirmar')).toBeTruthy();
    expect(screen.getByTestId('form-submit')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('form-submit'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('constrains the form to the shared maximum width on wide screens', async () => {
    await render(<Form submit="Confirmar" onSubmit={jest.fn()} />);

    expect(StyleSheet.flatten(screen.getByTestId('form').props.style)).toEqual(
      expect.objectContaining({ maxWidth: layout.formMaxWidth }),
    );
  });

  it('lets the form and its actions use the full width on narrow screens', async () => {
    mockWidth(699);
    await render(<Form submit="Confirmar" onSubmit={jest.fn()} />);

    expect(StyleSheet.flatten(screen.getByTestId('form').props.style).maxWidth).toBeUndefined();
    const submitStyle = StyleSheet.flatten(screen.getByTestId('form-submit').props.style);

    expect(submitStyle).toEqual(expect.objectContaining({ width: '100%' }));
    expect(submitStyle.maxWidth).toBeUndefined();
  });

  it('makes the submit button full width when it is the only action', async () => {
    await render(<Form submit="Confirmar" onSubmit={jest.fn()} />);

    expect(StyleSheet.flatten(screen.getByTestId('form-submit').props.style)).toEqual(
      expect.objectContaining({ width: '100%' }),
    );
    expect(screen.queryByTestId('form-cancel')).toBeNull();
  });

  it('places cancel and submit side by side when cancel is provided', async () => {
    const onCancel = jest.fn();
    await render(<Form submit="Confirmar" cancel="Cancelar" onSubmit={jest.fn()} onCancel={onCancel} />);

    expect(screen.getByText('Cancelar')).toBeTruthy();
    expect(screen.getByTestId('form-cancel').parent?.props.style).toEqual(
      expect.objectContaining({ flex: 1, marginRight: expect.any(Number) }),
    );
    expect(screen.getByTestId('form-submit').parent?.props.style).toEqual(
      expect.objectContaining({ flex: 1 }),
    );
    expect(screen.getByTestId('form-submit').parent?.parent?.props.style).toEqual(
      expect.objectContaining({ flexDirection: 'row' }),
    );

    await fireEvent.press(screen.getByTestId('form-cancel'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('forwards loading and disabled state to the action buttons', async () => {
    await render(
      <Form
        submit="Confirmar"
        cancel="Cancelar"
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
        submitButtonProps={{ loading: true, testID: 'custom-submit' }}
        cancelButtonProps={{ disabled: true, testID: 'custom-cancel' }}
      />,
    );

    expect(screen.getByTestId('custom-submit').props.accessibilityState).toEqual(
      expect.objectContaining({ busy: true, disabled: true }),
    );
    expect(screen.getByTestId('custom-cancel').props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
  });
});

function FormChild() {
  return <View testID="form-child" />;
}
