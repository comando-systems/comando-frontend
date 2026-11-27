import { fireEvent, render, screen } from '@testing-library/react-native';

import { Field } from '@/components/field';

describe('<Field />', () => {
  it('renders the label, input, and helper text', async () => {
    await render(<Field label="Table code" testID="table-input" helper="Use the printed code." />);

    expect(screen.getByText('Table code')).toBeTruthy();
    expect(screen.getByTestId('table-input')).toBeTruthy();
    expect(screen.getByText('Use the printed code.')).toBeTruthy();
  });

  it('shows validation errors instead of helper text', async () => {
    await render(
      <Field label="Table code" testID="table-input" helper="Use the printed code." error="Required." />,
    );

    expect(screen.getByText('Required.')).toBeTruthy();
    expect(screen.queryByText('Use the printed code.')).toBeNull();
  });

  it('renders an optional leading icon', async () => {
    await render(<Field label="Search tables" testID="table-search" icon="search" />);

    expect(screen.getByTestId('field-icon')).toBeTruthy();
    expect(screen.getByTestId('table-search')).toBeTruthy();
  });

  it('forwards text changes', async () => {
    const onChangeText = jest.fn();
    await render(<Field label="Table code" testID="table-input" onChangeText={onChangeText} />);

    await fireEvent.changeText(screen.getByTestId('table-input'), 'T-01');

    expect(onChangeText).toHaveBeenCalledWith('T-01');
  });
});
