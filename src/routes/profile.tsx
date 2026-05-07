import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

function ProfilePage() { return <AppShell><Profile /></AppShell>; }

function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile-page", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => { if (profile) setFullName(profile.full_name || ""); }, [profile]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated.");
  };

  const initial = (fullName || user?.email || "U")[0].toUpperCase();

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Profile</h1>
      <Card className="p-6 shadow-soft">
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-full gradient-brand text-white flex items-center justify-center text-2xl font-bold">{initial}</div>
          <div>
            <p className="font-semibold text-lg">{fullName || user?.email}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled />
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />} Save changes</Button>
            <Button variant="outline" onClick={async () => { await signOut(); navigate({ to: "/login" }); }}>
              <LogOut className="size-4" /> Log out
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
