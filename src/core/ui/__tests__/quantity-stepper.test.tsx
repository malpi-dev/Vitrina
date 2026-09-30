import { fireEvent, render, screen } from '@testing-library/react-native';

import { QuantityStepper } from '../quantity-stepper';

const setup = async (value: number, onChange = jest.fn()) => {
  await render(<QuantityStepper value={value} min={1} max={3} onChange={onChange} testID="qty" />);
  return onChange;
};

describe('QuantityStepper', () => {
  it('increments and decrements within limits', async () => {
    const onChange = await setup(2);
    await fireEvent.press(screen.getByTestId('qty-increment'));
    expect(onChange).toHaveBeenLastCalledWith(3);
    await fireEvent.press(screen.getByTestId('qty-decrement'));
    expect(onChange).toHaveBeenLastCalledWith(1);
    expect(screen.getByTestId('qty-value')).toHaveTextContent('2');
  });

  it('disables decrement at min', async () => {
    const onChange = await setup(1);
    expect(screen.getByTestId('qty-decrement')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('qty-decrement'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('disables increment at max', async () => {
    const onChange = await setup(3);
    expect(screen.getByTestId('qty-increment')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('qty-increment'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
