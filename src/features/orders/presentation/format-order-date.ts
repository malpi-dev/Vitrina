const DAY = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });
const DAY_TIME = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/** "Oct 6, 2026" */
export const formatOrderDay = (date: Date): string => DAY.format(date);
/** "Oct 6, 10:42 AM" */
export const formatOrderDateTime = (date: Date): string => DAY_TIME.format(date);
