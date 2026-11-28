import { render, screen } from '@testing-library/react-native';

import { SectionPlaceholder } from '@/components/section-placeholder';

describe('<SectionPlaceholder />', () => {
  it('shows a section title and description', async () => {
    await render(
      <SectionPlaceholder title="Mesas" description="O serviço de mesas está disponível." />,
    );

    expect(screen.getByText('Mesas')).toBeTruthy();
    expect(screen.getByText('O serviço de mesas está disponível.')).toBeTruthy();
  });
});
