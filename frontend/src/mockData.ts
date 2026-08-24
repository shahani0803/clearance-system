import { Student, AttendanceLog } from './Types';

const INITIAL_STUDENTS: Student[] = [
  {
    id: '1',
    studentId: '29338',
    name: 'Ricci Esparagosa',
    organization: 'ESO',
    subOrganization: 'ICEPEP',
    course: 'BS Computer Engineering',
    year: 3,
    rfidUid: 'A1B2C3D4',

    fines: {
      total: 0,
      isPaid: true
    },
    // Updated keys to match the ESO workflow: 
    // Course Org -> ESO Council -> SBO -> Library -> Dean
    clearanceStatus: {
      course_org: true,
      eso_council: true,
      sbo: true,
      library: false,
      dean: false
    }
  },
  {
    id: '2',
    studentId: '29439',
    name: 'Maria Gracia',
    organization: 'CCS',
    course: 'BS Information Technology',
    year: 2,
    rfidUid: 'E5F6G7H8',
    // Halimbawa ng student na may outstanding balance:
    fines: {
      total: 150.50,
      isPaid: false
    },
    // Updated keys to match the CCS workflow: 
    // CCS Council -> SBO -> Lab -> Library -> Dean
    clearanceStatus: {
      ccs_council: true,
      sbo: true,
      laboratory: false,
      library: false,
      dean: false
    }
  }
];

const INITIAL_LOGS: AttendanceLog[] = [
  {
    id: 'L1',
    timestamp: new Date().toISOString(),
    rfidUid: 'A1B2C3D4',
    studentName: 'Ricci Esparagosa',
    action: 'Scan',
    status: 'Success'
  }
];

// Helper to get students from LocalStorage or use defaults
export const getStoredStudents = (): Student[] => {
  if (typeof window === 'undefined') return INITIAL_STUDENTS;
  const data = localStorage.getItem('rfid_students');
  try {
    return data ? JSON.parse(data) : INITIAL_STUDENTS;
  } catch (e) {
    return INITIAL_STUDENTS;
  }
};

// Helper to get logs from LocalStorage or use defaults
export const getStoredLogs = (): AttendanceLog[] => {
  if (typeof window === 'undefined') return INITIAL_LOGS;
  const data = localStorage.getItem('rfid_logs');
  try {
    return data ? JSON.parse(data) : INITIAL_LOGS;
  } catch (e) {
    return INITIAL_LOGS;
  }
};

// Main function to persist changes
export const saveData = (students: Student[], logs: AttendanceLog[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('rfid_students', JSON.stringify(students));
    localStorage.setItem('rfid_logs', JSON.stringify(logs));
  }
};