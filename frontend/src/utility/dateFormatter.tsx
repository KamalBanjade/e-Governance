// utils/dateFormatter.ts
export const formatDateForInput = (dateString: string): string => {
  return dateString.split('T')[0];
};

export const formatDateForApi = (dateString: string): string => {
  return dateString.includes('T') ? dateString : `${dateString}T00:00:00`;
};