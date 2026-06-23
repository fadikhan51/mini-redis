export const matchGlob = (pattern: string, str: string): boolean => {
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex special characters
    .replace(/\\\*/g, '.*')               // map \* to .*
    .replace(/\\\?/g, '.');               // map \? to .
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(str);
};
