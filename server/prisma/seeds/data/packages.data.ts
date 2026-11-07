// Prices are taka per month; the yearly price is twelve times that. maxStudents null = unlimited.
export const packagesData = [
  { code: 'BASIC', name: 'Basic', maxStudents: 500, monthlyPrice: 500, sortOrder: 1 },
  { code: 'STANDARD', name: 'Standard', maxStudents: 1000, monthlyPrice: 1000, sortOrder: 2 },
  { code: 'PREMIUM', name: 'Premium', maxStudents: null, monthlyPrice: 1500, sortOrder: 3 },
];