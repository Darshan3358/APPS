// ─── Type Interfaces Only ───────────────────────────────────────────────────
// All data comes from the live MongoDB backend (localhost:5001/api).
// No mock/fallback data is used in this project.

export interface UserData {
  _id: string;
  name: string;
  phone: string;
  city: string;
  isBlocked: boolean;
  profilePhoto?: string;
  role?: string;
  isApproved?: boolean;
  aadhaarCard?: string;
  panCard?: string;
  kycStatus?: string;
}

export interface WorkerData {
  _id: string;
  name: string;
  profession: string;
  isApproved: boolean;
  phone?: string;
  city?: string;
  email?: string;
  profilePhoto?: string;
  aadhaarCard?: string;
  panCard?: string;
}

export interface BookingData {
  _id: string;
  customerName: string;
  workerName: string;
  serviceName: string;
  price: number;
  status: string;
}

export interface SubscriptionData {
  _id: string;
  partnerName: string;
  planName: string;
  amount: number;
  paymentMethod: string;
  status: string;
  startDate?: string;
  endDate?: string;
  date?: string;
}

export interface ReportData {
  _id: string;
  category: string;
  dotColor: string;
  timestamp: string;
  description: string;
}
