export interface Customer {
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
