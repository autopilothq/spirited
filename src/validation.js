
export const isNumber = (obj) => typeof obj === 'number';
export const isNumberArray = (obj) => Array.isArray(obj) && obj.every(isNumber);
