import { render, screen } from '@testing-library/react-native';

import { Badge } from '@/components/badge';

describe('<Badge />', () => {
  it('renders a label with the default tone', async () => {
    await render(<Badge label="Aberto" />);

    expect(screen.getByText('Aberto')).toBeTruthy();
  });

  it('renders a semantic icon', async () => {
    await render(<Badge label="Pago" tone="success" icon="check" />);

    expect(screen.getByText('Pago')).toBeTruthy();
    expect(screen.getByTestId('badge-icon')).toBeTruthy();
  });
});
