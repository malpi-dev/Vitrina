import { fireEvent, screen } from '@testing-library/react-native';

import { routerMock } from '@/test/expo-router-mock';
import { renderWithProviders } from '@/test/render-with-providers';

import FiltersScreen from '../screens/filters-screen';

jest.mock('expo-router', () => jest.requireActual('@/test/expo-router-mock').expoRouterMock);

describe('FiltersScreen', () => {
  beforeEach(() => routerMock.reset());

  it('shows an error and blocks Apply when min is greater than max', async () => {
    await renderWithProviders(<FiltersScreen />);
    await fireEvent.changeText(screen.getByTestId('filter-min-price'), '50');
    await fireEvent.changeText(screen.getByTestId('filter-max-price'), '20');
    expect(screen.getByTestId('filter-range-error')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('apply-filters-button'));
    expect(routerMock.dismissTo).not.toHaveBeenCalled();
  });

  it('applies the filters keeping q and category and clearing the rest', async () => {
    routerMock.setSearchParams({ q: 'mug', category: '00000000-0000-4000-8000-000000000102' });
    await renderWithProviders(<FiltersScreen />);
    await fireEvent.changeText(screen.getByTestId('filter-min-price'), '10');
    await fireEvent.changeText(screen.getByTestId('filter-max-price'), '3a0');
    await fireEvent(screen.getByTestId('filter-in-stock'), 'valueChange', true);
    await fireEvent.press(screen.getByTestId('sort-price-desc'));
    await fireEvent.press(screen.getByTestId('apply-filters-button'));
    expect(routerMock.dismissTo).toHaveBeenCalledWith({
      pathname: '/',
      params: {
        q: 'mug',
        category: '00000000-0000-4000-8000-000000000102',
        min: '10',
        max: '30',
        inStock: '1',
        sort: 'price_desc',
      },
    });
  });

  it('starts from the current params and Reset clears price, stock and sort', async () => {
    routerMock.setSearchParams({ min: '5', max: '40', inStock: '1', sort: 'price_asc' });
    await renderWithProviders(<FiltersScreen />);
    expect(screen.getByTestId('filter-min-price').props.value).toBe('5');
    expect(screen.getByTestId('filter-max-price').props.value).toBe('40');
    await fireEvent.press(screen.getByTestId('reset-filters-button'));
    expect(screen.getByTestId('filter-min-price').props.value).toBe('');
    expect(screen.getByTestId('filter-max-price').props.value).toBe('');
    await fireEvent.press(screen.getByTestId('apply-filters-button'));
    expect(routerMock.dismissTo).toHaveBeenCalledWith({
      pathname: '/',
      params: {
        q: undefined,
        category: undefined,
        min: undefined,
        max: undefined,
        inStock: undefined,
        sort: undefined,
      },
    });
  });
});
