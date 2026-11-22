import { fireEvent, render, screen } from '@testing-library/react-native';

import { QuantityStepper } from '@/components/quantity-stepper';

describe('<QuantityStepper />', () => {
  it('renders decrease and increase controls around the value', async () => {
    await render(<QuantityStepper value={2} onChange={jest.fn()} />);

    expect(screen.getByTestId('quantity-stepper-decrease')).toBeTruthy();
    expect(screen.getByTestId('quantity-stepper-value').props.children).toBe(2);
    expect(screen.getByTestId('quantity-stepper-increase')).toBeTruthy();
  });

  it('keeps the value positive', async () => {
    const onChange = jest.fn();
    await render(<QuantityStepper value={1} onChange={onChange} />);

    expect(
      screen.getByTestId('quantity-stepper-decrease').props.accessibilityState.disabled,
    ).toBe(true);
    await fireEvent.press(screen.getByTestId('quantity-stepper-decrease'));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('increases and decreases by one', async () => {
    const onChange = jest.fn();
    await render(<QuantityStepper value={2} onChange={onChange} />);

    await fireEvent.press(screen.getByTestId('quantity-stepper-increase'));
    await fireEvent.press(screen.getByTestId('quantity-stepper-decrease'));

    expect(onChange).toHaveBeenNthCalledWith(1, 3);
    expect(onChange).toHaveBeenNthCalledWith(2, 1);
  });

  it('disables increases at the maximum', async () => {
    const onChange = jest.fn();
    await render(<QuantityStepper value={5} max={5} onChange={onChange} />);

    expect(screen.getByTestId('quantity-stepper-increase').props.accessibilityState.disabled).toBe(
      true,
    );
    await fireEvent.press(screen.getByTestId('quantity-stepper-increase'));

    expect(onChange).not.toHaveBeenCalled();
  });
});
