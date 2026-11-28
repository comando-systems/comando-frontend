import { fireEvent, render, screen } from '@testing-library/react-native';

import { EmptyState } from '@/components/empty-state';

describe('<EmptyState />', () => {
  it('renders a title and description', async () => {
    await render(
      <EmptyState title="Nenhuma mesa aberta" description="Abra uma mesa para iniciar um pedido." />,
    );

    expect(screen.getByText('Nenhuma mesa aberta')).toBeTruthy();
    expect(screen.getByText('Abra uma mesa para iniciar um pedido.')).toBeTruthy();
  });

  it('offers an action when configured', async () => {
    const onAction = jest.fn();
    await render(<EmptyState title="Nenhum item" actionLabel="Atualizar" onAction={onAction} />);

    await fireEvent.press(screen.getByTestId('empty-state-action'));

    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
