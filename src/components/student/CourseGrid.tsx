
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Calendar, Play, Trash2 } from "lucide-react";
import { ref, remove } from "firebase/database";
import { database } from "@/firebase";
import { toast } from "sonner";

interface CourseGridProps {
  enrollments: any[];
  onCourseSelect: (enrollment: any) => void;
}

export const CourseGrid: React.FC<CourseGridProps> = ({ 
  enrollments, 
  onCourseSelect 
}) => {
  if (enrollments.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/20">
        <BookOpen className="h-12 w-12 mx-auto text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">No Courses Found</h3>
        <p className="mt-2 text-muted-foreground">
          You are not enrolled in any courses yet. Join a course using an access code.
        </p>
      </div>
    );
  }

  const handleDeleteEnrollment = async (e: React.MouseEvent, enrollmentId: string) => {
    e.stopPropagation(); // Prevent card click event from firing
    
    try {
      // Delete the enrollment from the database
      await remove(ref(database, `enrollments/${enrollmentId}`));
      toast.success("Course removed successfully");
      
      // Force reload to refresh the enrollments list
      window.location.reload();
    } catch (error) {
      console.error("Error deleting enrollment:", error);
      toast.error("Failed to remove course");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {enrollments.map((enrollment) => (
        <Card 
          key={enrollment.id} 
          className="overflow-hidden cursor-pointer relative" 
          onClick={() => onCourseSelect(enrollment)}
        >
          <CardContent className="p-0">
            <div className="relative h-40 bg-gradient-to-r from-blue-500 to-purple-500">
              <div className="absolute inset-0 flex items-center justify-center">
                <BookOpen className="h-16 w-16 text-white opacity-25" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                <Badge className="mb-2">{enrollment.course?.category || 'General'}</Badge>
                <h3 className="text-lg font-semibold text-white truncate">{enrollment.course?.title}</h3>
              </div>
              <Button 
                variant="destructive" 
                size="icon" 
                className="absolute top-2 right-2 rounded-full opacity-80 hover:opacity-100"
                onClick={(e) => handleDeleteEnrollment(e, enrollment.id)}
                title="Unenroll from course"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Started {new Date(enrollment.enrolled_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {enrollment.course?.description || "No description available"}
              </p>
              
              <div className="mt-4">
                <div className="flex justify-between mb-1 text-sm">
                  <span>Progress</span>
                  <span>{enrollment.progress || 0}%</span>
                </div>
                <Progress value={enrollment.progress || 0} className="h-2" />
              </div>
              
              <Button className="w-full mt-4 gap-2">
                <Play className="h-4 w-4" />
                View Course
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
