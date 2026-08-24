import { Student, AttendanceLog } from './Types';

const BASE_URL = `http://${window.location.hostname}:5001/api`;

export const api = {
  // 1. Kunin ang lahat ng students mula sa Database
  getStudents: async (): Promise<Student[]> => {
    try {
      const res = await fetch(`${BASE_URL}/students`);
      if (!res.ok) throw new Error(`Server Error: ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("❌ Error fetching students:", err);
      return []; // Nagbabalik ng empty array para hindi mag-error ang .map() sa UI
    }
  },

  // 2. Kunin ang logs mula sa Database
  getLogs: async (): Promise<AttendanceLog[]> => {
    try {
      const res = await fetch(`${BASE_URL}/attendance/logs`);
      if (!res.ok) throw new Error(`Server Error: ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("❌ Error fetching logs:", err);
      return [];
    }
  },

  // 3. Mag-add ng bagong student sa Database
  addStudent: async (studentData: any): Promise<Student | null> => {
    try {
      const res = await fetch(`${BASE_URL}/students/add/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData),
      });

      const data = await res.json();

      if (!res.ok) {
        // Para makita natin ang error message mula sa backend (e.g., Duplicate ID)
        console.error("Backend Error:", data.error);
        throw new Error(data.error || "Failed to add student");
      }

      // Kung ang backend ay nagbabalik ng { success: true, student: ... }
      return data.student || data;
    } catch (err) {
      console.error("❌ Error adding student:", err);
      return null;
    }
  },

  updateStudent: async (id: string, data: Partial<Student>): Promise<boolean> => {
    try {
      const res = await fetch(`${BASE_URL}/students/${id}`, {
        method: 'PATCH', // Siguraduhin na PATCH o PUT ang gamit sa backend routes mo
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.ok;
    } catch (error) {
      console.error("API Update Error:", error);
      return false;
    }
  },

  // 4. Update ng clearance status (Checklist)
  updateClearance: async (id: string, status: Record<string, boolean>): Promise<boolean> => {
    try {
      const res = await fetch(`${BASE_URL}/students/update-clearance/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearanceStatus: status }),
      });
      return res.ok;
    } catch (err) {
      console.error("❌ Error updating clearance:", err);
      return false;
    }
  },

  // 5. Pag-process ng RFID scan (Verification)
  processRfidScan: async (rfidUid: string): Promise<{ success: boolean; studentName?: string; message?: string }> => {
    try {
      const res = await fetch(`${BASE_URL}/attendance/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfidUid }),
      });
      return await res.json();
    } catch (err) {
      console.error("❌ Error processing RFID scan:", err);
      return { success: false, message: "Network connection error" };
    }
  },

  getEventHistory: async (): Promise<any[]> => {
    try {
      const res = await fetch(`${BASE_URL}/events/history`);
      if (!res.ok) throw new Error(`Server Error: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error("❌ Error fetching event history:", err);
      return [];
    }
  },

  // --- FINE MANAGEMENT ---

  getFinesSummary: async (): Promise<{ totalUncollected: number; totalCollected: number; byOrganization: Record<string, { uncollected: number; collected: number }> }> => {
    try {
      const res = await fetch(`${BASE_URL}/fines/summary`);
      if (!res.ok) throw new Error(`Server Error: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('❌ Error fetching fines summary:', err);
      return { totalUncollected: 0, totalCollected: 0, byOrganization: {} };
    }
  },

  getStudentFines: async (studentId: string) => {
    try {
      const res = await fetch(`${BASE_URL}/fines/student/${studentId}`);
      if (!res.ok) throw new Error(`Server Error: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('❌ Error fetching student fines:', err);
      return { uncollected: [], collected: [], totalUncollected: 0, totalCollected: 0 };
    }
  },

  markFinePaid: async (studentId: string, fineIndex: number): Promise<boolean> => {
    try {
      const res = await fetch(`${BASE_URL}/fines/${studentId}/${fineIndex}/mark-paid`, { method: 'PUT' });
      return res.ok;
    } catch (err) {
      console.error('❌ Error marking fine as paid:', err);
      return false;
    }
  },

  approveFinePaid: async (studentId: string, fineIndex: number): Promise<boolean> => {
    try {
      const res = await fetch(`${BASE_URL}/fines/${studentId}/${fineIndex}/approve-payment`, { method: 'PUT' });
      return res.ok;
    } catch (err) {
      console.error('❌ Error approving fine payment:', err);
      return false;
    }
  },

  getFinesCollections: async (): Promise<{ collected: any[]; totalAmount: number; totalRecords: number }> => {
    try {
      const res = await fetch(`${BASE_URL}/fines/collections`);
      if (!res.ok) throw new Error(`Server Error: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('❌ Error fetching collections:', err);
      return { collected: [], totalAmount: 0, totalRecords: 0 };
    }
  },

  getUncollectedFines: async () => {
    try {
      const res = await fetch(`${BASE_URL}/fines/uncollected/all`);
      if (!res.ok) throw new Error(`Server Error: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('❌ Error fetching uncollected fines:', err);
      return { uncollected: [], totalAmount: 0, totalRecords: 0 };
    }
  },

  editFine: async (studentId: string, fineId: string, newAmount: number): Promise<{ success: boolean; error?: string; student?: Student }> => {
    try {
      const res = await fetch(`${BASE_URL}/fines/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, fineId, newAmount })
      });
      return await res.json();
    } catch (err) {
      console.error('❌ Error editing fine:', err);
      return { success: false, error: 'Network error' };
    }
  },

  applyFines: async (eventName: string, organization: string, subOrganization: string, fineAmount: number, absentStudentIds: string[]) => {
    try {
      const res = await fetch(`${BASE_URL}/fines/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventName, organization, subOrganization, fineAmount, absentStudentIds })
      });
      if (!res.ok) throw new Error(`Server Error: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('❌ Error applying fines:', err);
      return { success: false };
    }
  }
};