export const getUserRole = () => {
  return parseInt(localStorage.getItem('userTypeId') || '0', 10);
};

export const isAdmin = () => getUserRole() === 1;
export const isCustomer = () => getUserRole() === 2;
export const isEmployee = () => getUserRole() === 3;
// auth.ts
export const AUTH_TOKEN_KEY = 'authToken';
export const getAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY);
