/** A message shown in a panel's StatusBanner. */
export interface StatusMessage {
  variant: 'info' | 'success' | 'warning' | 'error';
  text: string;
}
