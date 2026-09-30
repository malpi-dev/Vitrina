import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { AddressForm } from '../components/address-form';

const fill = async (values: Record<string, string>) => {
  for (const [testID, value] of Object.entries(values)) {
    await fireEvent.changeText(screen.getByTestId(testID), value);
  }
};

describe('AddressForm', () => {
  it('starts with country US and the default name', async () => {
    await render(<AddressForm submitLabel="Save" defaultFullName="Sam" onSubmit={jest.fn()} />);
    expect(screen.getByTestId('address-country').props.value).toBe('US');
    expect(screen.getByTestId('address-full-name').props.value).toBe('Sam');
  });

  it('does not submit and shows errors when required fields are empty', async () => {
    const onSubmit = jest.fn();
    await render(<AddressForm submitLabel="Save" onSubmit={onSubmit} />);
    await fireEvent.press(screen.getByTestId('save-address-button'));
    expect((await screen.findAllByText('Required')).length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText('Invalid postal code')).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a normalized address (trimmed, upper-case country, blank optionals removed)', async () => {
    const onSubmit = jest.fn();
    await render(<AddressForm submitLabel="Save" onSubmit={onSubmit} />);
    await fill({
      'address-full-name': ' Sam Shopper ',
      'address-line1': '1 Main St',
      'address-line2': '   ',
      'address-city': 'Austin',
      'address-state': 'TX',
      'address-postal-code': '78701',
      'address-country': 'us',
      'address-phone': '',
    });
    await fireEvent.press(screen.getByTestId('save-address-button'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const submitted = onSubmit.mock.calls[0]![0] as Record<string, unknown>;
    expect(submitted).toEqual({
      fullName: 'Sam Shopper',
      line1: '1 Main St',
      city: 'Austin',
      state: 'TX',
      postalCode: '78701',
      country: 'US',
    });
  });

  it('prefills from the initial value and uses the given submit label', async () => {
    await render(
      <AddressForm
        submitLabel="Use this address"
        initialValue={{
          fullName: 'A',
          line1: 'L1',
          city: 'C',
          state: 'S',
          postalCode: '12345',
          country: 'CA',
        }}
        onSubmit={jest.fn()}
      />,
    );
    expect(screen.getByTestId('address-city').props.value).toBe('C');
    expect(screen.getByText('Use this address')).toBeOnTheScreen();
  });
});
