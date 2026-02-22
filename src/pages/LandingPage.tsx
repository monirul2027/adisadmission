import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { GraduationCap, ShieldCheck } from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <img
            alt="Alor Disha Islamic School"
            className="mx-auto h-24 w-24 rounded-full bg-white p-1 mb-4 shadow-lg"
            src="/lovable-uploads/b3369ca5-553a-4c65-961b-27d4deb3ca86.jpg"
          />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Alor Disha Islamic School</h1>
          <p className="text-sm opacity-90 mt-2 max-w-lg mx-auto">
            Dakshin Krishnanagar, Malancha-Antardwipa Road, Dhuliyan, Murshidabad, 742202
          </p>
          <div className="mt-4 inline-block bg-accent text-accent-foreground px-6 py-2 rounded-full text-sm font-semibold shadow">
            Online Admission Portal
          </div>
        </div>
      </header>

      {/* Portal Selection */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl w-full">
          <Card
            className="group cursor-pointer border-2 border-transparent hover:border-primary transition-all duration-300 hover:shadow-xl"
            onClick={() => navigate("/student/login")}
          >
            <CardHeader className="text-center pb-2">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl text-primary">Student Panel</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground text-sm mb-4">
                Apply for New Admission or Admission Test. Track your application status and print forms.
              </p>
              <Button className="w-full" size="lg">
                Enter Student Portal
              </Button>
            </CardContent>
          </Card>

          <Card
            className="group cursor-pointer border-2 border-transparent hover:border-primary transition-all duration-300 hover:shadow-xl"
            onClick={() => navigate("/admin/login")}
          >
            <CardHeader className="text-center pb-2">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <ShieldCheck className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl text-primary">Admin Panel</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground text-sm mb-4">
                Manage admissions, approve applications, configure forms, and export data.
              </p>
              <Button className="w-full" size="lg" variant="outline">
                Enter Admin Portal
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-muted py-4 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} Alor Disha Islamic School. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
