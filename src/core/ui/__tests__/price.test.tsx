import { render, screen } from '@testing-library/react-native';

import { Price } from '../price';

describe('Price', () => {
  it.each([
    [499, '$4.99'],
    [120000, '$1,200.00'],
  ])('renders %i cents as %s', async (cents, text) => {
    await render(<Price cents={cents} />);
    expect(screen.getByText(text)).toBeTruthy();
  });

  it('renders every size', async () => {
    await render(
      <>
        <Price cents={100} size="sm" testID="sm" />
        <Price cents={100} size="lg" strikethrough testID="lg" />
      </>,
    );
    expect(screen.getByTestId('sm')).toBeTruthy();
    expect(screen.getByTestId('lg')).toBeTruthy();
  });
});
