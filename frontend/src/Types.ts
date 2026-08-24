export const getClearanceSteps = (student: Student) => {
  const steps = [];

  // 1. Always start with Sub-Org if available
  if (student.subOrganization) {
    steps.push({ id: 'subOrg', label: student.subOrganization });
  }

  // 2. Organization-specific steps
  if (student.organization === 'ESO') {
    steps.push({ id: 'eso', label: 'ESO (Engineering Student Org)' });
    steps.push({ id: 'sbo', label: 'SBO (Student Body Org)' });
  } else if (student.organization === 'CCS') {
    steps.push({ id: 'ccs', label: 'CCS Council' });
    steps.push({ id: 'sbo', label: 'SBO' });
    steps.push({ id: 'laboratory', label: 'Comp Lab Custodian' });
  } else {
    // NABA or others
    steps.push({ id: 'naba', label: 'NABA Organization' });
    steps.push({ id: 'sbo', label: 'SBO' });
    steps.push({ id: 'registrar', label: 'Registrar' });
  }

  return steps;
};

export interface Student {
  id: string;
  _id?: string;
  name: string;
  studentId: string;
  course: string;
  year: number;
  profilePic?: string;
  organization: 'CCS' | 'ESO' | 'NABA';
  subOrganization?: string;

  fines: {
    total: number;
    isPaid: boolean;
  };
  fineHistory?: { event: string; amount: number; date: string }[];
  clearanceStatus: Record<string, boolean>;
  rfidUid: string;

  finesActive?: Array<{
    _id?: string;
    eventName: string;
    organization: string;
    subOrganization: string;
    amount: number;
    status: 'active' | 'pending' | 'approved' | 'collected';
    dateIssued: string;
    studentMarkedPaidAt?: string;
    adminApprovedAt?: string;
    notes?: string;
    attendancePhase?: string;
    currentHash?: string;
    previousHash?: string;
  }>;
  totalUncollectedFines?: number;
  totalCollectedFines?: number;
}

export interface AttendanceLog {
  id: string;
  timestamp: string;
  rfidUid: string;
  studentId?: string;
  studentName: string;
  action: 'Login' | 'Logout' | 'Scan' | 'Login Attempt';
  status: 'Success' | 'Failed' | 'Present' | 'Absent';
  eventName?: string;
  session?: string;
}

export type UserRole = 'admin' | 'student' | null;

// Add this to your App State
export interface AuthState {
  role: UserRole;
  studentData?: Student; // Stores the specific student if role is 'student'
}

export interface HistoricalEvent {
  _id: string;
  name: string;
  date: string;
  organization: string;
  subOrganization: string;
  eventMode: string;
  attendees: {
    studentId: string;
    name: string;
    session: string;
    timestamp: string;
  }[];
  absentees: {
    studentId: string;
    name: string;
    missedSession: string;
    fineAmount: number;
  }[];
  totalFines: number;
  isFinished: boolean;
}

export type ViewType = 'dashboard' | 'students' | 'logs' | 'clearance' | 'history' | 'blockchain' | 'collections';
