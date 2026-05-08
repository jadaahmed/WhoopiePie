export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Enums: {
      app_role: "student" | "staff" | "admin";
      community_post_type: "announcement" | "event";
      course_type: "core" | "elective" | "lab" | "seminar";
      reservation_status: "scheduled" | "cancelled";
      room_type: "classroom" | "lab";
      student_record_status: "active" | "inactive" | "graduated";
      teaching_assignment_role: "professor" | "ta";
    };
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          full_name: string | null;
          university_id: string | null;
          department: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          full_name?: string | null;
          university_id?: string | null;
          department?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          role?: Database["public"]["Enums"]["app_role"];
          full_name?: string | null;
          university_id?: string | null;
          department?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          name: string;
          code: string;
          department: string;
          semester: string;
          type: Database["public"]["Enums"]["course_type"];
          description: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          department: string;
          semester: string;
          type: Database["public"]["Enums"]["course_type"];
          description?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          code?: string;
          department?: string;
          semester?: string;
          type?: Database["public"]["Enums"]["course_type"];
          description?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      course_prerequisites: {
        Row: {
          course_id: string;
          prerequisite_course_id: string;
          created_at: string;
        };
        Insert: {
          course_id: string;
          prerequisite_course_id: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      student_completed_courses: {
        Row: {
          student_id: string;
          course_id: string;
          completed_at: string;
        };
        Insert: {
          student_id: string;
          course_id: string;
          completed_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      study_plan_courses: {
        Row: {
          id: string;
          student_id: string;
          course_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          course_id: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      course_staff_assignments: {
        Row: {
          id: string;
          course_id: string;
          staff_id: string;
          assignment_role: Database["public"]["Enums"]["teaching_assignment_role"];
          assigned_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          staff_id: string;
          assignment_role: Database["public"]["Enums"]["teaching_assignment_role"];
          assigned_by?: string | null;
          created_at?: string;
        };
        Update: {
          assignment_role?: Database["public"]["Enums"]["teaching_assignment_role"];
          assigned_by?: string | null;
        };
        Relationships: [];
      };
      community_posts: {
        Row: {
          id: string;
          title: string;
          description: string;
          category: string;
          post_type: Database["public"]["Enums"]["community_post_type"];
          post_date: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          category: string;
          post_type: Database["public"]["Enums"]["community_post_type"];
          post_date: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          category?: string;
          post_type?: Database["public"]["Enums"]["community_post_type"];
          post_date?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      student_records: {
        Row: {
          id: string;
          student_id: string;
          full_name: string;
          email: string;
          phone: string;
          address: string;
          department: string;
          program: string;
          academic_level: string;
          enrollment_year: number;
          status: Database["public"]["Enums"]["student_record_status"];
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          full_name: string;
          email: string;
          phone: string;
          address: string;
          department: string;
          program: string;
          academic_level: string;
          enrollment_year: number;
          status?: Database["public"]["Enums"]["student_record_status"];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string;
          email?: string;
          phone?: string;
          address?: string;
          department?: string;
          program?: string;
          academic_level?: string;
          enrollment_year?: number;
          status?: Database["public"]["Enums"]["student_record_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      rooms: {
        Row: {
          id: string;
          name: string;
          type: Database["public"]["Enums"]["room_type"];
          capacity: number;
          location: string;
          equipment: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: Database["public"]["Enums"]["room_type"];
          capacity: number;
          location: string;
          equipment?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          type?: Database["public"]["Enums"]["room_type"];
          capacity?: number;
          location?: string;
          equipment?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      room_reservations: {
        Row: {
          id: string;
          room_id: string;
          course_id: string | null;
          session_name: string;
          instructor_id: string;
          start_at: string;
          end_at: string;
          expected_attendance: number;
          required_equipment: string[];
          status: Database["public"]["Enums"]["reservation_status"];
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          course_id?: string | null;
          session_name: string;
          instructor_id: string;
          start_at: string;
          end_at: string;
          expected_attendance: number;
          required_equipment?: string[];
          status?: Database["public"]["Enums"]["reservation_status"];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          room_id?: string;
          course_id?: string | null;
          session_name?: string;
          instructor_id?: string;
          start_at?: string;
          end_at?: string;
          expected_attendance?: number;
          required_equipment?: string[];
          status?: Database["public"]["Enums"]["reservation_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      course_materials: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          description: string | null;
          file_name: string;
          file_path: string;
          file_type: string;
          file_size: number;
          uploaded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          description?: string | null;
          file_name: string;
          file_path: string;
          file_type: string;
          file_size: number;
          uploaded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
