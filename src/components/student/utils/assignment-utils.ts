
import { ref, get, query, orderByChild, equalTo } from "firebase/database";
import { database } from "@/firebase";
import { Assignment } from "../types/assignment-types";
import { toast } from "sonner";

export const fetchStudentAssignments = async (userId: string): Promise<Assignment[]> => {
  if (!userId) {
    return [];
  }
  
  try {
    // First get the student's enrollments
    const enrollmentsRef = query(
      ref(database, 'enrollments'),
      orderByChild('student_id'),
      equalTo(userId)
    );
    
    const enrollmentSnapshot = await get(enrollmentsRef);
    if (!enrollmentSnapshot.exists()) {
      return [];
    }
    
    // Extract course IDs from enrollments
    const courseIds = [];
    enrollmentSnapshot.forEach((childSnapshot) => {
      courseIds.push(childSnapshot.val().course_id);
    });
    
    if (courseIds.length === 0) {
      return [];
    }
    
    const assignmentsData = [];
    const coursesMap = {};
    
    // Get course names for each course ID
    for (const courseId of courseIds) {
      const courseRef = ref(database, `courses/${courseId}`);
      const courseSnapshot = await get(courseRef);
      if (courseSnapshot.exists()) {
        coursesMap[courseId] = courseSnapshot.val().title;
      }
    }
    
    // Get assignments for each course - one by one to avoid index errors
    for (const courseId of courseIds) {
      try {
        // Fetching assignments for each course individually to avoid index errors
        const assignmentsRef = ref(database, 'assignments');
        const assignmentsSnapshot = await get(assignmentsRef);
        
        if (assignmentsSnapshot.exists()) {
          assignmentsSnapshot.forEach((childSnapshot) => {
            const assignment = childSnapshot.val();
            if (assignment.course_id === courseId) {
              assignmentsData.push({
                id: childSnapshot.key,
                ...assignment,
                course_name: coursesMap[courseId] || 'Unknown Course'
              });
            }
          });
        }
      } catch (courseError) {
        console.error(`Error fetching assignments for course ${courseId}:`, courseError);
        // Continue with other courses even if one fails
      }
    }
    
    // Get student's submissions
    const submissionsRef = query(
      ref(database, 'submissions'),
      orderByChild('user_id'),
      equalTo(userId)
    );
    
    const submissionsSnapshot = await get(submissionsRef);
    const submissions = [];
    if (submissionsSnapshot.exists()) {
      submissionsSnapshot.forEach((childSnapshot) => {
        submissions.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
    }
    
    // Combine assignments with submission data
    const assignmentsWithSubmissions = assignmentsData.map(assignment => {
      const submission = submissions.find(s => s.assignment_id === assignment.id);
      return {
        ...assignment,
        submitted: !!submission,
        submission: submission || null,
        // Handle AI-generated assignments that might have special fields
        assignmentType: assignment.assignmentType || "text",
        textContent: assignment.description || assignment.textContent
      };
    });
    
    return assignmentsWithSubmissions;
  } catch (error) {
    console.error("Error fetching assignments:", error);
    toast.error("Failed to fetch assignments. Please try again later.");
    return [];
  }
};
