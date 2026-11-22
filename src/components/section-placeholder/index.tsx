import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';

interface SectionPlaceholderProps {
  readonly title: string;
  readonly description: string;
}

export function SectionPlaceholder({ title, description }: SectionPlaceholderProps) {
  return (
    <Screen>
      <EmptyState title={title} description={description} />
    </Screen>
  );
}
