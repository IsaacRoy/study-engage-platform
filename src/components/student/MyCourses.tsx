import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { ref, get, query, orderByChild, equalTo } from "firebase/database";
import { database } from "@/firebase";
import { CourseGrid } from "./CourseGrid";
import { JoinCourseDialog } from "./JoinCourseDialog";
import { CourseDetailView } from "./CourseDetailView";

export const MyCourses = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [courseAssignments, setCourseAssignments] = useState<any[]>([]);
  const [courseAttendance, setCourseAttendance] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        
        // Get enrollments
        const enrollmentsRef = query(
          ref(database, 'enrollments'),
          orderByChild('student_id'),
          equalTo(user.id)
        );
        
        const enrollmentsSnapshot = await get(enrollmentsRef);
        
        const enrollmentData: any[] = [];
        
        if (enrollmentsSnapshot.exists()) {
          enrollmentsSnapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            enrollmentData.push({
              id: childSnapshot.key,
              ...data
            });
          });
        }
        
        // Fetch course details for each enrollment
        const enrollmentsWithCourses = await Promise.all(
          enrollmentData.map(async (enrollment) => {
            const courseRef = ref(database, `courses/${enrollment.course_id}`);
            const courseSnapshot = await get(courseRef);
            
            if (courseSnapshot.exists()) {
              const courseData = courseSnapshot.val();
              // Get instructor info
              let instructorName = "Unknown Instructor";
              if (courseData.instructor_id) {
                const instructorRef = ref(database, `users/${courseData.instructor_id}`);
                const instructorSnapshot = await get(instructorRef);
                if (instructorSnapshot.exists()) {
                  instructorName = instructorSnapshot.val().name || "Unknown Instructor";
                }
              }
              
              return {
                ...enrollment,
                course: {
                  id: enrollment.course_id,
                  ...courseData,
                  instructor_name: instructorName
                }
              };
            }
            return enrollment;
          })
        );
        
        setEnrollments(enrollmentsWithCourses);
      } catch (error) {
        console.error("Error fetching courses:", error);
        toast.error("Failed to load courses");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [user?.id]);

  const handleCourseSelect = async (enrollment: any) => {
    setSelectedCourse(enrollment);
    
    // Fetch assignments for this course
    try {
      const assignmentsRef = query(
        ref(database, 'assignments'),
        orderByChild('course_id'),
        equalTo(enrollment.course.id)
      );
      
      const assignmentsSnapshot = await get(assignmentsRef);
      const assignmentsData: any[] = [];
      
      if (assignmentsSnapshot.exists()) {
        assignmentsSnapshot.forEach((childSnapshot) => {
          assignmentsData.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
          });
        });
      }
      
      // Get submissions for each assignment
      const submissionsRef = query(
        ref(database, 'submissions'),
        orderByChild('user_id'),
        equalTo(user?.id)
      );
      
      const submissionsSnapshot = await get(submissionsRef);
      const submissions: any[] = [];
      
      if (submissionsSnapshot.exists()) {
        submissionsSnapshot.forEach((childSnapshot) => {
          submissions.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
          });
        });
      }
      
      // Attach submissions to assignments
      const assignmentsWithSubmissions = assignmentsData.map(assignment => {
        const submission = submissions.find(s => s.assignment_id === assignment.id);
        return {
          ...assignment,
          submitted: !!submission,
          submission: submission || null
        };
      });
      
      setCourseAssignments(assignmentsWithSubmissions);
      
      // Fetch attendance for this course
      const attendanceRef = query(
        ref(database, 'attendance'),
        orderByChild('student_id'),
        equalTo(user?.id)
      );
      
      const attendanceSnapshot = await get(attendanceRef);
      const attendanceData: any[] = [];
      
      if (attendanceSnapshot.exists()) {
        attendanceSnapshot.forEach((childSnapshot) => {
          const data = childSnapshot.val();
          if (data.course_id === enrollment.course.id) {
            attendanceData.push({
              id: childSnapshot.key,
              ...data
            });
          }
        });
      }
      
      setCourseAttendance(attendanceData);
      
    } catch (error) {
      console.error("Error fetching course details:", error);
      toast.error("Failed to load course details");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (selectedCourse) {
    return (
      <CourseDetailView
        selectedCourse={selectedCourse}
        courseAssignments={courseAssignments}
        courseAttendance={courseAttendance}
        onBack={() => setSelectedCourse(null)}
        onAssignmentsChange={setCourseAssignments}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* My Enrolled Courses Section */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">My Courses</h2>
          <Button onClick={() => setShowJoinDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Join Course
          </Button>
        </div>
        
        <CourseGrid 
          enrollments={enrollments} 
          onCourseSelect={handleCourseSelect} 
        />
      </div>
      
      {/* Join Course Dialog */}
      <JoinCourseDialog 
        open={showJoinDialog} 
        onOpenChange={setShowJoinDialog} 
      />
    </div>
  );
};
