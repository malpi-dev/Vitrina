import { fireEvent, screen } from '@testing-library/react-native';

import { MockStore } from '@/features/demo/data/mock-store';
import { renderWithProviders } from '@/test/render-with-providers';

import CatalogScreen from '../screens/catalog-screen';

describe('CatalogScreen (provisional)', () => {
  it('shows a loading state and then the products from the mock repository', async () => {
    await renderWithProviders(<CatalogScreen />);
    expect(screen.getByTestId('catalog-loading')).toBeOnTheScreen();
    expect(await screen.findByTestId('catalog-list')).toBeOnTheScreen();
    expect(screen.getByText('Brass Key Ring')).toBeOnTheScreen();
  });

  it('shows the error state and recovers on Retry', async () => {
    const store = new MockStore({ latencyMs: [0, 0] });
    store.failNext({ code: 'network' });
    await renderWithProviders(<CatalogScreen />, { store });
    expect(await screen.findByTestId('catalog-error')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('retry-button'));
    expect(await screen.findByTestId('catalog-list')).toBeOnTheScreen();
  });
});
