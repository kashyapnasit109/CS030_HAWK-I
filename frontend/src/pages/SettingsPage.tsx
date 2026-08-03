import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Settings as SettingsIcon, Save, ChevronRight } from "lucide-react";

const settingsSections = [
  {
    title: "General",
    description: "Application name, timezone, language preferences",
  },
  {
    title: "Notifications",
    description: "Alert thresholds, email/SMS notification rules",
  },
  {
    title: "Cameras",
    description: "Stream protocols, resolution defaults, retention policy",
  },
  {
    title: "Users & Roles",
    description: "User management, role-based access control",
  },
  {
    title: "Integrations",
    description: "Third-party services, webhook endpoints, API keys",
  },
];

export default function SettingsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-4">
        {settingsSections.map((section) => (
          <Card
            key={section.title}
            interactive
            glowColor="blue"
            className="group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border bg-blue-500/10 border-blue-500/20 text-blue-400 group-hover:bg-blue-500/20 transition-colors backdrop-blur-md">
                  <SettingsIcon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white tracking-wide" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                    {section.title}
                  </h3>
                  <p className="mt-1 text-xs text-hawk-muted">
                    {section.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm font-medium text-hawk-muted group-hover:text-blue-400 transition-colors duration-200">
                Configure <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-end pt-4">
        <Button
          variant="primary"
          size="lg"
          icon={<Save className="h-4 w-4" strokeWidth={1.75} />}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
