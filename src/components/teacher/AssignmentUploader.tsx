import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  CalendarIcon, 
  Upload, 
  Sparkles, 
  Loader2,
  Wand2,
  Lightbulb
} from "lucide-react";
import { toast } from "sonner";
import { ref, push, set } from "firebase/database";
import { database } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { createClient } from "@supabase/supabase-js";

interface AssignmentUploaderProps {
  courseId?: string;
}

const aiFormSchema = z.object({
  subject: z.string().min(2, { message: "Subject is required" }),
  topic: z.string().min(2, { message: "Topic is required" }),
  difficultyLevel: z.string(),
  grade: z.string(),
});

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(
  supabaseUrl as string,
  supabaseAnonKey as string
);

export const AssignmentUploader: React.FC<AssignmentUploaderProps> = ({ courseId }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [points, setPoints] = useState("10");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const { user } = useAuth();

  // Define form for AI generation
  const form = useForm<z.infer<typeof aiFormSchema>>({
    resolver: zodResolver(aiFormSchema),
    defaultValues: {
      subject: "",
      topic: "",
      difficultyLevel: "Intermediate",
      grade: "High School",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Please enter an assignment title");
      return;
    }
    
    if (!user?.id) {
      toast.error("You must be logged in to create an assignment");
      return;
    }
    
    if (!courseId) {
      toast.error("Course ID is required to create an assignment");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Create assignment in the database
      const assignmentRef = push(ref(database, 'assignments'));
      await set(assignmentRef, {
        course_id: courseId,
        teacher_id: user.id,
        title,
        description,
        due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
        points: parseInt(points) || 10,
        created_at: new Date().toISOString(),
        // In a real app, you would upload the file to storage and store the URL here
        file_name: file ? file.name : null,
      });
      
      toast.success("Assignment created successfully");
      
      // Reset form
      setTitle("");
      setDescription("");
      setDueDate(undefined);
      setPoints("10");
      setFile(null);
      
    } catch (error) {
      console.error("Error creating assignment:", error);
      toast.error("Failed to create assignment");
    } finally {
      setIsLoading(false);
    }
  };

  const generateAssignment = async (values: z.infer<typeof aiFormSchema>) => {
    if (!courseId) {
      toast.error("Course ID is required to generate an assignment");
      return;
    }

    setIsGenerating(true);
    setGeneratingProgress(25);

    try {
      // Use Supabase Edge Function to generate the assignment
      const { data, error } = await supabase.functions.invoke("generate-assignment", {
        body: {
          subject: values.subject,
          topic: values.topic,
          difficultyLevel: values.difficultyLevel,
          grade: values.grade,
        },
      });

      setGeneratingProgress(75);

      if (error) {
        throw new Error(error.message);
      }

      if (data && data.assignment) {
        setGeneratingProgress(100);
        const { title: generatedTitle, description: generatedDescription } = data.assignment;
        
        setTitle(generatedTitle || `Assignment on ${values.topic}`);
        setDescription(generatedDescription);

        // Switch to manual tab so user can see and edit the generated assignment
        document.getElementById("manual-tab")?.click();

        toast.success("Assignment generated successfully", {
          description: "You can now edit the generated assignment before creating it."
        });
      } else {
        // Fallback to direct API call if the Edge Function doesn't respond as expected
        await fallbackToDirectApiCall(values);
      }
    } catch (error) {
      console.error("Error generating assignment:", error);
      
      // Fallback to direct API call if the Edge Function fails
      await fallbackToDirectApiCall(values);
    } finally {
      setIsGenerating(false);
      setGeneratingProgress(0);
    }
  };

  const fallbackToDirectApiCall = async (values: z.infer<typeof aiFormSchema>) => {
    try {
        setGeneratingProgress(40);
        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyAHHuOkjP9NRWAYUKoKcnuZCoT-oSlK42s", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `Generate an assignment on the topic: ${values.topic} for the subject: ${values.subject} at ${values.difficultyLevel} difficulty level for ${values.grade} grade.` }]
                }]
            }),
        });

        setGeneratingProgress(80);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to generate assignment");
        }

        const data = await response.json();
        console.log("API Response:", data);

        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const generatedText = data.candidates[0].content.parts[0].text;
            setTitle(`Assignment on ${values.topic}`);
            setDescription(generatedText);

            // Switch to manual tab so user can see and edit the generated assignment
            document.getElementById("manual-tab")?.click();

            toast.success("Assignment generated successfully using fallback API", {
                description: "You can now edit the generated assignment before creating it."
            });
        } else {
            throw new Error("Invalid response format from API");
        }
    } catch (error) {
        console.error("Fallback API call failed:", error);
        toast.error(error instanceof Error ? error.message : "Failed to generate assignment");
    }
};

  async function generateCustomAssignment() { // Renamed function
    try {
        const response = await fetch('https://your-gemini-api-endpoint.com/generate-assignment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer AIzaSyAHHuOkjP9NRWAYUKoKcnuZCoT-oSlK42s`, // Include your API key here
            },
            body: JSON.stringify({ /* your request payload */ }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        // Handle the response data
    } catch (error) {
        console.error('Error generating assignment:', error);
        // Provide user feedback
    }
}

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Assignment</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="manual">
          <TabsList className="mb-6">
            <TabsTrigger value="manual" id="manual-tab">
              <Upload className="mr-2 h-4 w-4" />
              Manual Creation
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Sparkles className="mr-2 h-4 w-4" />
              AI Generator
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Assignment Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter assignment title"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter assignment description"
                  rows={8}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, 'PPP') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={setDueDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="points">Points</Label>
                  <Input
                    id="points"
                    type="number"
                    min="1"
                    max="100"
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="file">Attachment (Optional)</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                />
                {file && (
                  <p className="text-sm text-muted-foreground">
                    {file.name} ({Math.round(file.size / 1024)} KB)
                  </p>
                )}
              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Assignment...
                  </span>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Create Assignment
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="ai">
            <div className="bg-muted/30 p-4 rounded-lg mb-4 flex items-start space-x-3">
              <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium mb-1">AI Assignment Generator</h4>
                <p className="text-sm text-muted-foreground">
                  Let AI create a complete assignment for you based on your specifications.
                  Simply provide the subject, topic, difficulty level, and target grade.
                  The generated assignment will include learning objectives, requirements, and grading criteria.
                </p>
              </div>
            </div>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(generateAssignment)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Mathematics, Biology, Literature" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="topic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Topic</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Pythagorean Theorem, Photosynthesis, Shakespeare" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="difficultyLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Difficulty Level</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select difficulty" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Beginner">Beginner</SelectItem>
                            <SelectItem value="Intermediate">Intermediate</SelectItem>
                            <SelectItem value="Advanced">Advanced</SelectItem>
                            <SelectItem value="Expert">Expert</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="grade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grade Level</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select grade level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Elementary">Elementary</SelectItem>
                            <SelectItem value="Middle School">Middle School</SelectItem>
                            <SelectItem value="High School">High School</SelectItem>
                            <SelectItem value="College">College</SelectItem>
                            <SelectItem value="Graduate">Graduate</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {generatingProgress > 0 && generatingProgress < 100 && (
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                    <div 
                      className="bg-primary h-2.5 rounded-full transition-all duration-300" 
                      style={{ width: `${generatingProgress}%` }}
                    ></div>
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isGenerating}
                  variant="default"
                >
                  {isGenerating ? (
                    <span className="flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Assignment...
                    </span>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate Assignment
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
