import { fireEvent, render, screen } from '@testing-library/react-native';

import { CategoryEditor } from '@/components/category-editor';
import { MAX_ITEM_CATEGORIES } from '@/utils/categories';

describe('<CategoryEditor />', () => {
  it('adds trimmed categories and reports the new set', async () => {
    const onChange = jest.fn();

    await render(<CategoryEditor value={[]} onChange={onChange} testID="editor" />);

    expect(screen.getByTestId('editor-count').props.children).toBe('0/8 categories');
    await fireEvent.changeText(screen.getByTestId('editor-input'), '  Drinks  ');
    await fireEvent.press(screen.getByTestId('editor-add'));

    expect(onChange).toHaveBeenCalledWith(['Drinks']);
  });

  it('adds a category when the input is submitted', async () => {
    const onChange = jest.fn();

    await render(<CategoryEditor value={['Drinks']} onChange={onChange} testID="editor" />);

    await fireEvent.changeText(screen.getByTestId('editor-input'), 'Vegan');
    await fireEvent(screen.getByTestId('editor-input'), 'submitEditing');

    expect(onChange).toHaveBeenCalledWith(['Drinks', 'Vegan']);
  });

  it('shows validation errors and does not emit invalid values', async () => {
    const onChange = jest.fn();

    await render(<CategoryEditor value={['Drinks']} onChange={onChange} testID="editor" />);

    await fireEvent.press(screen.getByTestId('editor-add'));
    expect(screen.getByTestId('editor-error').props.children).toBe('Enter a category name.');

    await fireEvent.changeText(screen.getByTestId('editor-input'), 'drinks');
    await fireEvent.press(screen.getByTestId('editor-add'));
    expect(screen.getByTestId('editor-error').props.children).toBe(
      'This category is already listed.',
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes a category by its position', async () => {
    const onChange = jest.fn();

    await render(
      <CategoryEditor
        value={['Drinks', 'Vegan', 'Bakery']}
        onChange={onChange}
        testID="editor"
      />,
    );

    await fireEvent.press(screen.getByTestId('editor-chip-1'));

    expect(onChange).toHaveBeenCalledWith(['Drinks', 'Bakery']);
    expect(screen.getByText('Vegan')).toBeTruthy();
  });

  it('disables adding at the category limit', async () => {
    const onChange = jest.fn();
    const value = Array.from({ length: MAX_ITEM_CATEGORIES }, (_, index) => `Category ${index}`);

    await render(<CategoryEditor value={value} onChange={onChange} testID="editor" />);

    expect(screen.getByTestId('editor-count').props.children).toBe('8/8 categories');
    expect(screen.getByTestId('editor-add').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('editor-input').props.editable).toBe(false);
  });

  it('disables all controls when the form is busy', async () => {
    const onChange = jest.fn();

    await render(
      <CategoryEditor value={['Drinks']} onChange={onChange} disabled testID="editor" />,
    );

    expect(screen.getByTestId('editor-add').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('editor-input').props.editable).toBe(false);

    await fireEvent.press(screen.getByTestId('editor-chip-0'));

    expect(onChange).not.toHaveBeenCalled();
  });
});
