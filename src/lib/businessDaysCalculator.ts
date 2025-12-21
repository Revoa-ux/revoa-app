import { addDays, differenceInCalendarDays, isWeekend, format } from 'date-fns';

interface USHoliday {
  month: number;
  day: number;
  name: string;
}

const FIXED_US_HOLIDAYS: USHoliday[] = [
  { month: 1, day: 1, name: "New Year's Day" },
  { month: 7, day: 4, name: 'Independence Day' },
  { month: 12, day: 25, name: 'Christmas Day' },
  { month: 11, day: 11, name: 'Veterans Day' },
];

function getFloatingHolidays(year: number): Date[] {
  const holidays: Date[] = [];

  const mlkDay = getNthWeekdayOfMonth(year, 1, 1, 3);
  holidays.push(mlkDay);

  const presidentsDay = getNthWeekdayOfMonth(year, 2, 1, 3);
  holidays.push(presidentsDay);

  const memorialDay = getLastWeekdayOfMonth(year, 5, 1);
  holidays.push(memorialDay);

  const laborDay = getNthWeekdayOfMonth(year, 9, 1, 1);
  holidays.push(laborDay);

  const thanksgiving = getNthWeekdayOfMonth(year, 11, 4, 4);
  holidays.push(thanksgiving);

  return holidays;
}

function getNthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  n: number
): Date {
  const firstDay = new Date(year, month - 1, 1);
  const firstWeekday = firstDay.getDay();
  let diff = weekday - firstWeekday;
  if (diff < 0) diff += 7;
  const date = 1 + diff + (n - 1) * 7;
  return new Date(year, month - 1, date);
}

function getLastWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number
): Date {
  const lastDay = new Date(year, month, 0);
  const lastWeekday = lastDay.getDay();
  let diff = lastWeekday - weekday;
  if (diff < 0) diff += 7;
  const date = lastDay.getDate() - diff;
  return new Date(year, month - 1, date);
}

function isUSHoliday(date: Date): boolean {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const isFixedHoliday = FIXED_US_HOLIDAYS.some(
    (holiday) => holiday.month === month && holiday.day === day
  );

  if (isFixedHoliday) return true;

  const floatingHolidays = getFloatingHolidays(year);
  return floatingHolidays.some(
    (holiday) =>
      holiday.getFullYear() === year &&
      holiday.getMonth() === date.getMonth() &&
      holiday.getDate() === day
  );
}

export function isBusinessDay(date: Date): boolean {
  return !isWeekend(date) && !isUSHoliday(date);
}

export function addBusinessDays(startDate: Date, businessDays: number): Date {
  let currentDate = new Date(startDate);
  let daysAdded = 0;

  while (daysAdded < businessDays) {
    currentDate = addDays(currentDate, 1);
    if (isBusinessDay(currentDate)) {
      daysAdded++;
    }
  }

  return currentDate;
}

export function getBusinessDaysBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  let businessDays = 0;
  let currentDate = new Date(start);

  while (currentDate <= end) {
    if (isBusinessDay(currentDate)) {
      businessDays++;
    }
    currentDate = addDays(currentDate, 1);
  }

  return businessDays;
}

export function calculateExpectedDeliveryDate(
  fulfillmentDate: Date,
  maxBusinessDays: number
): Date {
  return addBusinessDays(fulfillmentDate, maxBusinessDays);
}

export function formatBusinessDaysRange(min: number, max: number): string {
  if (min === max) {
    return `${min} business ${min === 1 ? 'day' : 'days'}`;
  }
  return `${min}-${max} business days`;
}

export function getHolidayName(date: Date): string | null {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const fixedHoliday = FIXED_US_HOLIDAYS.find(
    (holiday) => holiday.month === month && holiday.day === day
  );

  if (fixedHoliday) return fixedHoliday.name;

  const year = date.getFullYear();
  const floatingHolidays = getFloatingHolidays(year);

  const mlkDay = floatingHolidays[0];
  if (date.getTime() === mlkDay.getTime()) return 'Martin Luther King Jr. Day';

  const presidentsDay = floatingHolidays[1];
  if (date.getTime() === presidentsDay.getTime()) return "Presidents' Day";

  const memorialDay = floatingHolidays[2];
  if (date.getTime() === memorialDay.getTime()) return 'Memorial Day';

  const laborDay = floatingHolidays[3];
  if (date.getTime() === laborDay.getTime()) return 'Labor Day';

  const thanksgiving = floatingHolidays[4];
  if (date.getTime() === thanksgiving.getTime()) return 'Thanksgiving';

  return null;
}
