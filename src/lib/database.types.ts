export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      articles: {
        Row: {
          author_id: string | null
          body: string | null
          cover_path: string | null
          created_at: string
          ensemble_id: string | null
          event_id: string | null
          excerpt: string | null
          id: string
          kind: Database["public"]["Enums"]["article_kind"]
          original_locale: Database["public"]["Enums"]["app_locale"]
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["access_level"]
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          cover_path?: string | null
          created_at?: string
          ensemble_id?: string | null
          event_id?: string | null
          excerpt?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["article_kind"]
          original_locale?: Database["public"]["Enums"]["app_locale"]
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["access_level"]
        }
        Update: {
          author_id?: string | null
          body?: string | null
          cover_path?: string | null
          created_at?: string
          ensemble_id?: string | null
          event_id?: string | null
          excerpt?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["article_kind"]
          original_locale?: Database["public"]["Enums"]["app_locale"]
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["access_level"]
        }
        Relationships: [
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_ensemble_id_fkey"
            columns: ["ensemble_id"]
            isOneToOne: false
            referencedRelation: "ensembles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: number
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: never
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: never
        }
        Relationships: []
      }
      bookings: {
        Row: {
          created_at: string
          email: string
          event_id: string
          full_name: string
          id: string
          note: string | null
          phone: string | null
          seats: number
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          event_id: string
          full_name: string
          id?: string
          note?: string | null
          phone?: string | null
          seats?: number
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          event_id?: string
          full_name?: string
          id?: string
          note?: string | null
          phone?: string | null
          seats?: number
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
          position: number
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          position?: number
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          position?: number
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          enrolled_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          enrolled_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_teachers: {
        Row: {
          course_id: string
          user_id: string
        }
        Insert: {
          course_id: string
          user_id: string
        }
        Update: {
          course_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_teachers_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_teachers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          cover_path: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          level: Database["public"]["Enums"]["course_level"]
          position: number
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          summary: string | null
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["access_level"]
        }
        Insert: {
          cover_path?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          level?: Database["public"]["Enums"]["course_level"]
          position?: number
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string | null
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["access_level"]
        }
        Update: {
          cover_path?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          level?: Database["public"]["Enums"]["course_level"]
          position?: number
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string | null
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["access_level"]
        }
        Relationships: [
          {
            foreignKeyName: "courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          author: string | null
          category_id: string | null
          course_id: string | null
          created_at: string
          description: string | null
          document_date: string | null
          ensemble_id: string | null
          event_id: string | null
          form_id: string | null
          id: string
          kind: Database["public"]["Enums"]["document_kind"]
          language: Database["public"]["Enums"]["app_locale"] | null
          maqam_id: string | null
          mime_type: string | null
          page_count: number | null
          rights: string | null
          size_bytes: number | null
          source: string | null
          status: Database["public"]["Enums"]["content_status"]
          storage_bucket: string
          storage_path: string
          title: string
          updated_at: string
          uploaded_by: string | null
          visibility: Database["public"]["Enums"]["access_level"]
        }
        Insert: {
          author?: string | null
          category_id?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          document_date?: string | null
          ensemble_id?: string | null
          event_id?: string | null
          form_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["document_kind"]
          language?: Database["public"]["Enums"]["app_locale"] | null
          maqam_id?: string | null
          mime_type?: string | null
          page_count?: number | null
          rights?: string | null
          size_bytes?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          storage_bucket?: string
          storage_path: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
          visibility?: Database["public"]["Enums"]["access_level"]
        }
        Update: {
          author?: string | null
          category_id?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          document_date?: string | null
          ensemble_id?: string | null
          event_id?: string | null
          form_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["document_kind"]
          language?: Database["public"]["Enums"]["app_locale"] | null
          maqam_id?: string | null
          mime_type?: string | null
          page_count?: number | null
          rights?: string | null
          size_bytes?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          storage_bucket?: string
          storage_path?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          visibility?: Database["public"]["Enums"]["access_level"]
        }
        Relationships: [
          {
            foreignKeyName: "documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_ensemble_id_fkey"
            columns: ["ensemble_id"]
            isOneToOne: false
            referencedRelation: "ensembles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "musical_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_maqam_id_fkey"
            columns: ["maqam_id"]
            isOneToOne: false
            referencedRelation: "maqamat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ensemble_members: {
        Row: {
          ensemble_id: string
          instrument: string | null
          joined_at: string
          left_at: string | null
          part: string | null
          user_id: string
        }
        Insert: {
          ensemble_id: string
          instrument?: string | null
          joined_at?: string
          left_at?: string | null
          part?: string | null
          user_id: string
        }
        Update: {
          ensemble_id?: string
          instrument?: string | null
          joined_at?: string
          left_at?: string | null
          part?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ensemble_members_ensemble_id_fkey"
            columns: ["ensemble_id"]
            isOneToOne: false
            referencedRelation: "ensembles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ensemble_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ensembles: {
        Row: {
          archived_at: string | null
          cover_path: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          leader_id: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          cover_path?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          leader_id?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          cover_path?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          leader_id?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ensembles_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendance: {
        Row: {
          event_id: string
          note: string | null
          recorded_at: string
          recorded_by: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          user_id: string
        }
        Insert: {
          event_id: string
          note?: string | null
          recorded_at?: string
          recorded_by?: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          user_id: string
        }
        Update: {
          event_id?: string
          note?: string | null
          recorded_at?: string
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendance_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_ensembles: {
        Row: {
          ensemble_id: string
          event_id: string
        }
        Insert: {
          ensemble_id: string
          event_id: string
        }
        Update: {
          ensemble_id?: string
          event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_ensembles_ensemble_id_fkey"
            columns: ["ensemble_id"]
            isOneToOne: false
            referencedRelation: "ensembles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_ensembles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_invitees: {
        Row: {
          event_id: string
          user_id: string
        }
        Insert: {
          event_id: string
          user_id: string
        }
        Update: {
          event_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_invitees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invitees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          event_id: string
          response: Database["public"]["Enums"]["rsvp_response"]
          updated_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          response: Database["public"]["Enums"]["rsvp_response"]
          updated_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          response?: Database["public"]["Enums"]["rsvp_response"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      program_edits: {
        Row: {
          edits: Json
          slug: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          edits?: Json
          slug: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          edits?: Json
          slug?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          address: string | null
          booking_closes_at: string | null
          capacity: number | null
          cover_path: string | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          is_bookable: boolean
          kind: Database["public"]["Enums"]["event_kind"]
          map_url: string | null
          price_tnd: number | null
          slug: string | null
          starts_at: string
          status: Database["public"]["Enums"]["event_status"]
          summary: string | null
          title: string
          updated_at: string
          venue: string | null
          visibility: Database["public"]["Enums"]["access_level"]
        }
        Insert: {
          address?: string | null
          booking_closes_at?: string | null
          capacity?: number | null
          cover_path?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_bookable?: boolean
          kind?: Database["public"]["Enums"]["event_kind"]
          map_url?: string | null
          price_tnd?: number | null
          slug?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["event_status"]
          summary?: string | null
          title: string
          updated_at?: string
          venue?: string | null
          visibility?: Database["public"]["Enums"]["access_level"]
        }
        Update: {
          address?: string | null
          booking_closes_at?: string | null
          capacity?: number | null
          cover_path?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_bookable?: boolean
          kind?: Database["public"]["Enums"]["event_kind"]
          map_url?: string | null
          price_tnd?: number | null
          slug?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          summary?: string | null
          title?: string
          updated_at?: string
          venue?: string | null
          visibility?: Database["public"]["Enums"]["access_level"]
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_answer_keys: {
        Row: {
          correct_option: number
          explanation: string | null
          question_id: string
        }
        Insert: {
          correct_option: number
          explanation?: string | null
          question_id: string
        }
        Update: {
          correct_option?: number
          explanation?: string | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_answer_keys_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "exercise_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_attempts: {
        Row: {
          answers: Json
          created_at: string
          exercise_id: string
          id: string
          max_score: number
          score: number
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          exercise_id: string
          id?: string
          max_score?: number
          score?: number
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          exercise_id?: string
          id?: string
          max_score?: number
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_attempts_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_questions: {
        Row: {
          exercise_id: string
          id: string
          options: Json
          points: number
          position: number
          prompt: string
          recording_id: string | null
        }
        Insert: {
          exercise_id: string
          id?: string
          options?: Json
          points?: number
          position?: number
          prompt: string
          recording_id?: string | null
        }
        Update: {
          exercise_id?: string
          id?: string
          options?: Json
          points?: number
          position?: number
          prompt?: string
          recording_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_questions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_questions_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          id: string
          instructions: string | null
          kind: Database["public"]["Enums"]["exercise_kind"]
          lesson_id: string
          loop_end_seconds: number | null
          loop_start_seconds: number | null
          position: number
          recording_id: string | null
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          instructions?: string | null
          kind: Database["public"]["Enums"]["exercise_kind"]
          lesson_id: string
          loop_end_seconds?: number | null
          loop_start_seconds?: number | null
          position?: number
          recording_id?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          instructions?: string | null
          kind?: Database["public"]["Enums"]["exercise_kind"]
          lesson_id?: string
          loop_end_seconds?: number | null
          loop_start_seconds?: number | null
          position?: number
          recording_id?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      instruments: {
        Row: {
          created_at: string
          description: string | null
          family: string | null
          id: string
          image_path: string | null
          name: string
          position: number
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          family?: string | null
          id?: string
          image_path?: string | null
          name: string
          position?: number
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          family?: string | null
          id?: string
          image_path?: string | null
          name?: string
          position?: number
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Relationships: []
      }
      lesson_prerequisites: {
        Row: {
          lesson_id: string
          required_lesson_id: string
        }
        Insert: {
          lesson_id: string
          required_lesson_id: string
        }
        Update: {
          lesson_id?: string
          required_lesson_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_prerequisites_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_prerequisites_required_lesson_id_fkey"
            columns: ["required_lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          lesson_id: string
          status: Database["public"]["Enums"]["progress_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          lesson_id: string
          status?: Database["public"]["Enums"]["progress_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          lesson_id?: string
          status?: Database["public"]["Enums"]["progress_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_resources: {
        Row: {
          caption: string | null
          document_id: string | null
          id: string
          lesson_id: string
          position: number
          recording_id: string | null
        }
        Insert: {
          caption?: string | null
          document_id?: string | null
          id?: string
          lesson_id: string
          position?: number
          recording_id?: string | null
        }
        Update: {
          caption?: string | null
          document_id?: string | null
          id?: string
          lesson_id?: string
          position?: number
          recording_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_resources_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_resources_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_resources_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          body: string | null
          course_id: string
          created_at: string
          created_by: string | null
          form_id: string | null
          id: string
          instrument_id: string | null
          is_preview: boolean
          level: Database["public"]["Enums"]["course_level"] | null
          maqam_id: string | null
          notation_path: string | null
          objectives: string[]
          position: number
          rhythm_id: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          course_id: string
          created_at?: string
          created_by?: string | null
          form_id?: string | null
          id?: string
          instrument_id?: string | null
          is_preview?: boolean
          level?: Database["public"]["Enums"]["course_level"] | null
          maqam_id?: string | null
          notation_path?: string | null
          objectives?: string[]
          position?: number
          rhythm_id?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          course_id?: string
          created_at?: string
          created_by?: string | null
          form_id?: string | null
          id?: string
          instrument_id?: string | null
          is_preview?: boolean
          level?: Database["public"]["Enums"]["course_level"] | null
          maqam_id?: string | null
          notation_path?: string | null
          objectives?: string[]
          position?: number
          rhythm_id?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "musical_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_maqam_id_fkey"
            columns: ["maqam_id"]
            isOneToOne: false
            referencedRelation: "maqamat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_rhythm_id_fkey"
            columns: ["rhythm_id"]
            isOneToOne: false
            referencedRelation: "rhythms"
            referencedColumns: ["id"]
          },
        ]
      }
      maqam_examples: {
        Row: {
          id: string
          maqam_id: string
          note: string | null
          position: number
          recording_id: string
          title: string | null
        }
        Insert: {
          id?: string
          maqam_id: string
          note?: string | null
          position?: number
          recording_id: string
          title?: string | null
        }
        Update: {
          id?: string
          maqam_id?: string
          note?: string | null
          position?: number
          recording_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maqam_examples_maqam_id_fkey"
            columns: ["maqam_id"]
            isOneToOne: false
            referencedRelation: "maqamat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maqam_examples_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      maqamat: {
        Row: {
          ajnas: Json
          created_at: string
          description: string | null
          dominant: string | null
          family: string | null
          id: string
          name: string
          notation_path: string | null
          position: number
          sayr: string | null
          scale_notes: string[]
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          tonic: string | null
          updated_at: string
        }
        Insert: {
          ajnas?: Json
          created_at?: string
          description?: string | null
          dominant?: string | null
          family?: string | null
          id?: string
          name: string
          notation_path?: string | null
          position?: number
          sayr?: string | null
          scale_notes?: string[]
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          tonic?: string | null
          updated_at?: string
        }
        Update: {
          ajnas?: Json
          created_at?: string
          description?: string | null
          dominant?: string | null
          family?: string | null
          id?: string
          name?: string
          notation_path?: string | null
          position?: number
          sayr?: string | null
          scale_notes?: string[]
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          tonic?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      membership_requests: {
        Row: {
          created_at: string
          email: string
          experience: string | null
          full_name: string
          id: string
          instruments: string[]
          part: Database["public"]["Enums"]["member_part"] | null
          message: string | null
          phone: string | null
          preferred_locale: Database["public"]["Enums"]["app_locale"]
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["request_status"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          experience?: string | null
          full_name: string
          id?: string
          instruments?: string[]
          part?: Database["public"]["Enums"]["member_part"] | null
          message?: string | null
          phone?: string | null
          preferred_locale?: Database["public"]["Enums"]["app_locale"]
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          experience?: string | null
          full_name?: string
          id?: string
          instruments?: string[]
          part?: Database["public"]["Enums"]["member_part"] | null
          message?: string | null
          phone?: string | null
          preferred_locale?: Database["public"]["Enums"]["app_locale"]
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membership_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      musical_forms: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          position: number
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          structure: string | null
          tradition: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          position?: number
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          structure?: string | null
          tradition?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          position?: number
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          structure?: string | null
          tradition?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          event_id: string | null
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_items: {
        Row: {
          note: string | null
          playlist_id: string
          position: number
          recording_id: string
        }
        Insert: {
          note?: string | null
          playlist_id: string
          position?: number
          recording_id: string
        }
        Update: {
          note?: string | null
          playlist_id?: string
          position?: number
          recording_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_items_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          course_id: string | null
          cover_path: string | null
          created_at: string
          description: string | null
          ensemble_id: string | null
          id: string
          owner_id: string | null
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["access_level"]
        }
        Insert: {
          course_id?: string | null
          cover_path?: string | null
          created_at?: string
          description?: string | null
          ensemble_id?: string | null
          id?: string
          owner_id?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["access_level"]
        }
        Update: {
          course_id?: string | null
          cover_path?: string | null
          created_at?: string
          description?: string | null
          ensemble_id?: string | null
          id?: string
          owner_id?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["access_level"]
        }
        Relationships: [
          {
            foreignKeyName: "playlists_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlists_ensemble_id_fkey"
            columns: ["ensemble_id"]
            isOneToOne: false
            referencedRelation: "ensembles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlists_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_private: {
        Row: {
          address: string | null
          admin_notes: string | null
          birth_date: string | null
          email: string | null
          emergency_contact: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          birth_date?: string | null
          email?: string | null
          emergency_contact?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          birth_date?: string | null
          email?: string | null
          emergency_contact?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_private_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          full_name: string
          id: string
          instruments: string[]
          part: Database["public"]["Enums"]["member_part"] | null
          joined_at: string | null
          notify_email: boolean
          notify_push: boolean
          preferred_locale: Database["public"]["Enums"]["app_locale"]
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string
          id: string
          instruments?: string[]
          part?: Database["public"]["Enums"]["member_part"] | null
          joined_at?: string | null
          notify_email?: boolean
          notify_push?: boolean
          preferred_locale?: Database["public"]["Enums"]["app_locale"]
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string
          id?: string
          instruments?: string[]
          part?: Database["public"]["Enums"]["member_part"] | null
          joined_at?: string | null
          notify_email?: boolean
          notify_push?: boolean
          preferred_locale?: Database["public"]["Enums"]["app_locale"]
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
        }
        Relationships: []
      }
      recordings: {
        Row: {
          category_id: string | null
          composer: string | null
          course_id: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          ensemble_id: string | null
          event_id: string | null
          form_id: string | null
          id: string
          language: Database["public"]["Enums"]["app_locale"] | null
          lyricist: string | null
          maqam_id: string | null
          mime_type: string | null
          performers: string | null
          recorded_on: string | null
          rhythm_id: string | null
          rights: string | null
          size_bytes: number | null
          source: string | null
          status: Database["public"]["Enums"]["content_status"]
          storage_bucket: string
          storage_path: string
          title: string
          updated_at: string
          uploaded_by: string | null
          visibility: Database["public"]["Enums"]["access_level"]
        }
        Insert: {
          category_id?: string | null
          composer?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          ensemble_id?: string | null
          event_id?: string | null
          form_id?: string | null
          id?: string
          language?: Database["public"]["Enums"]["app_locale"] | null
          lyricist?: string | null
          maqam_id?: string | null
          mime_type?: string | null
          performers?: string | null
          recorded_on?: string | null
          rhythm_id?: string | null
          rights?: string | null
          size_bytes?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          storage_bucket?: string
          storage_path: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
          visibility?: Database["public"]["Enums"]["access_level"]
        }
        Update: {
          category_id?: string | null
          composer?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          ensemble_id?: string | null
          event_id?: string | null
          form_id?: string | null
          id?: string
          language?: Database["public"]["Enums"]["app_locale"] | null
          lyricist?: string | null
          maqam_id?: string | null
          mime_type?: string | null
          performers?: string | null
          recorded_on?: string | null
          rhythm_id?: string | null
          rights?: string | null
          size_bytes?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          storage_bucket?: string
          storage_path?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          visibility?: Database["public"]["Enums"]["access_level"]
        }
        Relationships: [
          {
            foreignKeyName: "recordings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_ensemble_id_fkey"
            columns: ["ensemble_id"]
            isOneToOne: false
            referencedRelation: "ensembles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "musical_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_maqam_id_fkey"
            columns: ["maqam_id"]
            isOneToOne: false
            referencedRelation: "maqamat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_rhythm_id_fkey"
            columns: ["rhythm_id"]
            isOneToOne: false
            referencedRelation: "rhythms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rhythm_examples: {
        Row: {
          id: string
          note: string | null
          position: number
          recording_id: string
          rhythm_id: string
          title: string | null
        }
        Insert: {
          id?: string
          note?: string | null
          position?: number
          recording_id: string
          rhythm_id: string
          title?: string | null
        }
        Update: {
          id?: string
          note?: string | null
          position?: number
          recording_id?: string
          rhythm_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rhythm_examples_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rhythm_examples_rhythm_id_fkey"
            columns: ["rhythm_id"]
            isOneToOne: false
            referencedRelation: "rhythms"
            referencedColumns: ["id"]
          },
        ]
      }
      rhythms: {
        Row: {
          beats: number | null
          created_at: string
          description: string | null
          id: string
          name: string
          notation_path: string | null
          pattern: Json
          position: number
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          tempo_max: number | null
          tempo_min: number | null
          time_signature: string | null
          updated_at: string
        }
        Insert: {
          beats?: number | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          notation_path?: string | null
          pattern?: Json
          position?: number
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          tempo_max?: number | null
          tempo_min?: number | null
          time_signature?: string | null
          updated_at?: string
        }
        Update: {
          beats?: number | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          notation_path?: string | null
          pattern?: Json
          position?: number
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          tempo_max?: number | null
          tempo_min?: number | null
          time_signature?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          description: string | null
          key: string
          name_ar: string
          name_en: string
          name_fr: string
        }
        Insert: {
          description?: string | null
          key: string
          name_ar: string
          name_en: string
          name_fr: string
        }
        Update: {
          description?: string | null
          key?: string
          name_ar?: string
          name_en?: string
          name_fr?: string
        }
        Relationships: []
      }
      translations: {
        Row: {
          entity_id: string
          entity_type: string
          field: string
          id: string
          is_reviewed: boolean
          locale: Database["public"]["Enums"]["app_locale"]
          translated_by: string | null
          updated_at: string
          value: string
        }
        Insert: {
          entity_id: string
          entity_type: string
          field: string
          id?: string
          is_reviewed?: boolean
          locale: Database["public"]["Enums"]["app_locale"]
          translated_by?: string | null
          updated_at?: string
          value: string
        }
        Update: {
          entity_id?: string
          entity_type?: string
          field?: string
          id?: string
          is_reviewed?: boolean
          locale?: Database["public"]["Enums"]["app_locale"]
          translated_by?: string | null
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "translations_translated_by_fkey"
            columns: ["translated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          role: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          role: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      event_seats_left: { Args: { p_event_id: string }; Returns: number }
      submit_exercise_attempt: {
        Args: { p_answers: Json; p_exercise_id: string }
        Returns: Json
      }
    }
    Enums: {
      access_level: "public" | "members" | "ensemble" | "course" | "private"
      app_locale: "ar" | "fr" | "en"
      article_kind: "news" | "announcement" | "page" | "story"
      attendance_status: "present" | "absent" | "excused" | "late"
      booking_status: "pending" | "confirmed" | "waitlist" | "cancelled"
      content_status: "draft" | "published" | "archived"
      course_level: "beginner" | "intermediate" | "advanced"
      document_kind:
        | "score"
        | "lyrics"
        | "program"
        | "photo"
        | "article"
        | "study"
        | "other"
      event_kind:
        | "concert"
        | "rehearsal"
        | "workshop"
        | "lesson"
        | "meeting"
        | "other"
      event_status: "draft" | "published" | "cancelled" | "completed"
      exercise_kind:
        | "listening"
        | "performance"
        | "quiz"
        | "maqam_identification"
        | "rhythm_identification"
      member_part: "lead_vocal" | "percussion" | "instrument"
      member_status: "pending" | "active" | "suspended" | "inactive"
      progress_status: "in_progress" | "completed"
      request_status: "pending" | "approved" | "rejected"
      rsvp_response: "yes" | "maybe" | "no"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      access_level: ["public", "members", "ensemble", "course", "private"],
      app_locale: ["ar", "fr", "en"],
      article_kind: ["news", "announcement", "page", "story"],
      attendance_status: ["present", "absent", "excused", "late"],
      booking_status: ["pending", "confirmed", "waitlist", "cancelled"],
      content_status: ["draft", "published", "archived"],
      course_level: ["beginner", "intermediate", "advanced"],
      document_kind: [
        "score",
        "lyrics",
        "program",
        "photo",
        "article",
        "study",
        "other",
      ],
      event_kind: [
        "concert",
        "rehearsal",
        "workshop",
        "lesson",
        "meeting",
        "other",
      ],
      event_status: ["draft", "published", "cancelled", "completed"],
      exercise_kind: [
        "listening",
        "performance",
        "quiz",
        "maqam_identification",
        "rhythm_identification",
      ],
      member_part: ["lead_vocal", "percussion", "instrument"],
      member_status: ["pending", "active", "suspended", "inactive"],
      progress_status: ["in_progress", "completed"],
      request_status: ["pending", "approved", "rejected"],
      rsvp_response: ["yes", "maybe", "no"],
    },
  },
} as const
