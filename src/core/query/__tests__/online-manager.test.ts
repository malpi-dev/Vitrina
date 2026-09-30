import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

import { setupQueryManagers } from '../online-manager';

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { addEventListener: jest.fn() },
}));

const addEventListener = NetInfo.addEventListener as jest.Mock;

describe('setupQueryManagers', () => {
  afterEach(() => {
    jest.clearAllMocks();
    onlineManager.setEventListener(() => () => undefined);
    onlineManager.setOnline(true);
  });

  it('follows the connection state in live mode', () => {
    let listener: (state: { isConnected: boolean | null }) => void = () => undefined;
    addEventListener.mockImplementation((l) => {
      listener = l;
      return () => undefined;
    });
    const cleanup = setupQueryManagers(false);
    listener({ isConnected: false });
    expect(onlineManager.isOnline()).toBe(false);
    listener({ isConnected: true });
    expect(onlineManager.isOnline()).toBe(true);
    cleanup();
  });

  it('stays online in demo mode even without a connection', () => {
    onlineManager.setOnline(false);
    const cleanup = setupQueryManagers(true);
    expect(addEventListener).not.toHaveBeenCalled();
    expect(onlineManager.isOnline()).toBe(true);
    cleanup();
  });
});
