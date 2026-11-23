import { render, screen } from '@testing-library/react-native';

import { SectionPlaceholder } from '@/components/section-placeholder';

describe('<SectionPlaceholder />', () => {
  it('shows a section title and description', async () => {
    await render(<SectionPlaceholder title="Tables" description="Table service is available." />);

    expect(screen.getByText('Tables')).toBeTruthy();
    expect(screen.getByText('Table service is available.')).toBeTruthy();
  });
});
