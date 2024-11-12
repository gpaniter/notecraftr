import { Note } from '../types/notecraftr';

export function getUniqueId(reference: number[]): number {
  let newId = 0;
  while (containsNumber(newId, reference)) {
    newId += 1;
  }
  return newId;
}

export function containsNumber(target: number, array: number[]) {
  const numberSet = new Set(array);
  return numberSet.has(target);
}


export function formatDate(date: Date, dateFormat: string): string {
  const monthsShort: string[] = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthsLong: string[] = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const day: number = date.getDate();
  const year: number = date.getFullYear();
  const monthIndex: number = date.getMonth();
  const hours24: number = date.getHours();
  const hours12: number = hours24 % 12 || 12; // Convert to 12-hour format
  const minutes: number = date.getMinutes();
  const seconds: number = date.getSeconds();
  const ampm: string = hours24 >= 12 ? 'PM' : 'AM';

  // Function to get the ordinal suffix (st, nd, rd, th)
  const getOrdinalSuffix = (n: number): string => {
    if (n > 3 && n < 21) return 'th'; // Special case for 11th to 19th
    switch (n % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const dayWithOrdinal = `${day}${getOrdinalSuffix(day)}`; // e.g., "1st", "2nd", "3rd", etc.


  const replacements: { [key: string]: string | number } = {
    MMM: monthsShort[monthIndex],
    MMMM: monthsLong[monthIndex],
    MM: String(monthIndex + 1).padStart(2, "0"),
    // M: monthIndex + 1,
    DD: String(day).padStart(2, "0"),
    // D: day, Conflicts with day ordinal
    Do: dayWithOrdinal,
    YYYY: year,
    YY: String(year).slice(-2),
    HH: String(hours24).padStart(2, "0"),  // 24-hour format
    H: hours24,
    hh: String(hours12).padStart(2, "0"),  // 12-hour format
    h: hours12,
    mm: String(minutes).padStart(2, "0"),
    m: minutes,
    ss: String(seconds).padStart(2, "0"),
    s: seconds,
    A: ampm,
  };

  return dateFormat.replace(/MMMM|MMM|MM|M|DD|Do|YYYY|YY|HH|H|hh|h|mm|m|ss|s|A/g, (match: string) => {
    return replacements[match] as string;
  });
}


function isDev() {
  return window.location.host.startsWith("localhost:");
}

export function setToDatabase<T>(key: string, data: T) {
  const v = JSON.stringify(data);
  localStorage.setItem(key, v);
}

export function getFromDatabase<T>(key: string): T | undefined {
  const newData = localStorage.getItem(key);
  if (typeof newData === "string") {
    const parsed = JSON.parse(newData, dateReviver);
    return parsed ? (parsed as T) : undefined;
  } else return undefined;
}

export function dateReviver(key: string, value: any) {
  if (key === "dateValue" || key=== "updatedDate") {
    try {
      return new Date(value);
    } catch (error) {
      console.log(error, "Created new Date object.");
      return new Date();
    }
  }
  return value;
}


