import { render, screen } from '@testing-library/react-native';

import { Badge } from '@/components/badge';

describe('<Badge />', () => {
  it('renders a label with the default tone', async () => {
    await render(<Badge label="Open" />);

    expect(screen.getByText('Open')).toBeTruthy();
  });

  it('renders a semantic icon', async () => {
    await render(<Badge label="Paid" tone="success" icon="check" />);

    expect(screen.getByText('Paid')).toBeTruthy();
    expect(screen.getByTestId('badge-icon')).toBeTruthy();
  });
});
