import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto text-center">
        {/* Logo and Brand */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center shadow-lg">
              <i className="fas fa-project-diagram text-primary-foreground text-2xl" />
            </div>
            <h1 className="text-4xl font-bold text-foreground">iPlan</h1>
          </div>
          <p className="text-xl text-muted-foreground">
            Comprehensive Release Management Platform
          </p>
        </div>

        {/* Hero Content */}
        <div className="mb-12">
          <h2 className="text-3xl font-semibold text-foreground mb-6">
            Streamline Your Release Process
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Manage release plans, coordinate teams, track progress, and ensure smooth deployments 
            with automated notifications and real-time dashboard updates.
          </p>
          
          <Button 
            onClick={handleLogin}
            size="lg" 
            className="text-lg px-8 py-3"
            data-testid="button-login"
          >
            <i className="fas fa-sign-in-alt mr-2" />
            Sign In to Get Started
          </Button>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-users text-blue-600 text-xl" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Role-Based Access</h3>
              <p className="text-sm text-muted-foreground">
                Release Managers, Team Leads, POCs, and Viewers with appropriate permissions
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-calendar-alt text-green-600 text-xl" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Smart Scheduling</h3>
              <p className="text-sm text-muted-foreground">
                Fixed time, dependency triggers, and simultaneous step execution
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-bell text-purple-600 text-xl" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Auto Notifications</h3>
              <p className="text-sm text-muted-foreground">
                Email alerts for assignments, triggers, and status changes
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-chart-line text-orange-600 text-xl" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Real-Time Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Live dashboard with progress tracking and timeline visualization
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Release Process Steps */}
        <div className="bg-card rounded-lg p-8 border border-border shadow-sm">
          <h3 className="text-xl font-semibold text-foreground mb-6">Release Process Flow</h3>
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-8">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                1
              </div>
              <div className="text-left">
                <div className="font-medium text-foreground">Before Release</div>
                <div className="text-sm text-muted-foreground">Code freeze, testing, prep</div>
              </div>
            </div>

            <i className="fas fa-arrow-right text-muted-foreground hidden md:block" />

            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
                2
              </div>
              <div className="text-left">
                <div className="font-medium text-foreground">Actual Release</div>
                <div className="text-sm text-muted-foreground">Deployment, validation</div>
              </div>
            </div>

            <i className="fas fa-arrow-right text-muted-foreground hidden md:block" />

            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                3
              </div>
              <div className="text-left">
                <div className="font-medium text-foreground">Post Release</div>
                <div className="text-sm text-muted-foreground">Monitoring, documentation</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-muted-foreground">
          <p>© 2024 iPlan. Comprehensive Release Management Platform.</p>
        </div>
      </div>
    </div>
  );
}
