import { getDatabase, ref, get } from "firebase/database";

// Function to fetch and display courses
export async function fetchAndDisplayCourses() {
  const db = getDatabase();
  const coursesRef = ref(db, 'courses');
  const snapshot = await get(coursesRef);

  if (snapshot.exists()) {
    const courses = [];
    snapshot.forEach(courseSnapshot => {
      const courseData = courseSnapshot.val();
      // Check if the course has a title and other required fields
      if (courseData && courseData.title && courseData.title.trim() !== "" &&
          courseData.description && courseData.description.trim() !== "") {
        courses.push(courseData);
      }
    });

    // Display courses to students
    displayCourses(courses);
  }
}

function displayCourses(courses) {
  // Implement your logic to display courses to students
  console.log(courses);
}

// Call this function to fetch and display courses
fetchAndDisplayCourses();