export interface Customer {
  cusId: number;
  scNo: string;
  name: string;
  address: string;
  dob: string;
  mobileNo: string;
  citizenshipNo: string;
  demandType: string;
  registeredBranchId: number;
  citizenshipFile: File | null;
  houseFile: File | null;
}

export interface Branch {
  branchId: number;
  name: string;
}

export interface EmployeeDetails {
  empId?: number;
  empType: string;
  branchId: number;
  employeeName: string;
  contactNo: string;
  status: string;
  userId?: string;
}
export interface DemandType {
  demandTypeId: number;
  name: string;
  description: string;
  status: string;
}
export interface Bill {
  billNo?: number;
  cusId: number;
  billDate: string;
  billMonth: string;
  billYear: number;
  previousReading: number;
  currentReading: number;
  consumedUnit?: number;
  minimumCharge: number;
  rate: number;
  totalBillAmount?: number;
  // customer?: Customer;
}
export interface Branch {
  branchId: number;
  name: string;
  location: string;
  contactDetails: string;
  inchargeName: string;
  status: string;
}

