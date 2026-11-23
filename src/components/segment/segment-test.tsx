import { fireEvent, render, screen } from '@testing-library/react-native';

import { Segment } from '@/components/segment';

const options = [
  { label: 'Counter', value: 'counter', icon: 'counter' as const },
  { label: 'Export', value: 'export', icon: 'send' as const },
] as const;

describe('<Segment />', () => {
  it('renders all options and marks the selected one', async () => {
    await render(<Segment options={options} value="counter" onChange={jest.fn()} />);

    expect(screen.getByText('Counter')).toBeTruthy();
    expect(screen.getByText('Export')).toBeTruthy();
    expect(screen.getByTestId('segment-counter').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('segment-export').props.accessibilityState.selected).toBe(false);
  });

  it('reports the chosen option', async () => {
    const onChange = jest.fn();
    await render(<Segment options={options} value="counter" onChange={onChange} />);

    await fireEvent.press(screen.getByTestId('segment-export'));

    expect(onChange).toHaveBeenCalledWith('export');
  });

  it('ignores disabled options', async () => {
    const onChange = jest.fn();
    await render(
      <Segment
        options={[...options.slice(0, 1), { label: 'Export', value: 'export', disabled: true }]}
        value="counter"
        onChange={onChange}
      />,
    );

    await fireEvent.press(screen.getByTestId('segment-export'));

    expect(onChange).not.toHaveBeenCalled();
  });
});
