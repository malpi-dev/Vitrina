// The toast auto-dismiss timer (2.5 s) would otherwise keep the Jest worker alive after a test that shows a toast.
afterEach(() => {
  require('./src/core/ui/toast.store').useToastStore.getState().hide();
});
