import React, { useState, useEffect } from 'react';

const CourseList: React.FC = () => {
    const [courses, setCourses] = useState<any[]>([]);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const response = await fetch('/api/courses');
                const data = await response.json();
                setCourses(data); // Ensure 'data' is an array
            } catch (error) {
                console.error('Error fetching courses:', error);
            }
        };

        fetchCourses();
    }, []);

    return (
        <div>
            {courses.map(course => (
                <div key={course.id}>{course.name}</div>
            ))}
        </div>
    );
};

export default CourseList;