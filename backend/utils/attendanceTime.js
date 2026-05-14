const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const parseTimeToMinutes = (time) => {
  if (!TIME_PATTERN.test(time || '')) return null;

  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const startOfLocalDay = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const endOfLocalDay = (date) => {
  const value = startOfLocalDay(date);
  value.setHours(23, 59, 59, 999);
  return value;
};

const combineDateAndTime = (date, time) => {
  const minutes = parseTimeToMinutes(time);
  if (minutes === null) return null;

  const value = startOfLocalDay(date);
  value.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return value;
};

const parseLocalDateOnly = (value) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date(value);
};

const isSameLocalDay = (first, second) => {
  return startOfLocalDay(first).getTime() === startOfLocalDay(second).getTime();
};

module.exports = {
  TIME_PATTERN,
  parseTimeToMinutes,
  startOfLocalDay,
  endOfLocalDay,
  combineDateAndTime,
  parseLocalDateOnly,
  isSameLocalDay
};
