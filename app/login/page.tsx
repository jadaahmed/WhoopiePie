import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { createClient } from "@/lib/supabase/server";

const modules = ["Facilities", "Curriculum", "Staff", "Community"];

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/dashboard");
  }

  return (
    <main className="auth-layout">
      <section className="auth-panel">
        <div className="auth-brand">
          <span className="brand-mark">WPU</span>
          <span>Whoopie Pie University</span>
        </div>

        <div className="auth-copy">
          <p className="eyebrow">Campus operations</p>
          <h1>Whoopie Pie University</h1>
          <p>
            One workspace for academic planning, campus resources, staff services, and
            university communication.
          </p>

          <div className="module-strip" aria-label="System modules">
            {modules.map((module) => (
              <span className="module-pill" key={module}>
                {module}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="auth-card-wrap">
        <LoginForm />
      </section>
    </main>
  );
}
