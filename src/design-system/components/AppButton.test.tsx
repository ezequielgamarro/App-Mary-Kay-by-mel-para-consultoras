import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppButton } from './AppButton';

describe('AppButton', () => {
  it('llama a onPress al tocarlo', async () => {
    const onPress = jest.fn();
    await render(<AppButton label="Guardar" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('no dispara onPress cuando está deshabilitado', async () => {
    const onPress = jest.fn();
    await render(<AppButton label="Guardar" onPress={onPress} disabled />);

    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));

    expect(onPress).not.toHaveBeenCalled();
  });
});
