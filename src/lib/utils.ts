import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  // Use a Set to deduplicate class names
  const classNames = new Set<string>();
  
  // Process all inputs
  const combined = clsx(inputs);
  
  // Split the combined string and add each class to the Set
  combined.split(' ').forEach(className => {
    if (className) classNames.add(className);
  });
  
  // Convert Set back to string
  return Array.from(classNames).join(' ');
}