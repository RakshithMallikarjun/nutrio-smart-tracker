import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Lock, Loader2, Phone, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sign in — Nutrio" }] }),
  component: AuthPage,
});

type AuthMode = "email" | "phone";

function AuthPage() {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<AuthMode>("email");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { name } },
        });
        if (error) throw error;
        toast.success("Account created! You're signed in.");
        track("user_signed_up", { method: "email" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        track("user_signed_in", { method: "email" });
      }
      navigate({ to: "/", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const fullPhone = () => `${countryCode}${phone.replace(/\D/g, "")}`;

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone() });
      if (error) throw error;
      setOtpSent(true);
      toast.success("OTP sent to your mobile");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send OTP. Phone auth must be enabled in backend.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: fullPhone(),
        token: otp,
        type: "sms",
      });
      if (error) throw error;
      track("user_signed_in", { method: "phone_otp" });
      navigate({ to: "/", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message || `${provider} sign-in failed`);
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/", replace: true });
    track("user_signed_in", { method: provider });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5" style={{ backgroundColor: "#eeebe3" }}>
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl" style={{ backgroundColor: "#171e19", color: "#fff" }}>
            🥑
          </div>
          <h1 className="text-3xl font-black text-charcoal">Nutrio</h1>
          <p className="mt-1 text-sm font-bold" style={{ color: "#b7c6c2" }}>
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </p>
        </div>

        <div className="rounded-[2rem] bg-white p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]">
          {/* Email / Mobile tabs */}
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-cream p-1">
            {(["email", "phone"] as AuthMode[]).map((m) => {
              const active = authMode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setAuthMode(m); setOtpSent(false); }}
                  className="rounded-full py-2 text-xs font-extrabold transition-colors"
                  style={{
                    backgroundColor: active ? "#171e19" : "transparent",
                    color: active ? "#ffffff" : "#171e19",
                  }}
                >
                  {m === "email" ? "Email" : "Mobile"}
                </button>
              );
            })}
          </div>

          {authMode === "email" ? (
            <form onSubmit={handleEmail} className="space-y-3">
              {mode === "signup" && (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-2xl bg-cream px-4 py-3 text-sm font-bold text-charcoal outline-none sage-border-soft focus:ring-2 focus:ring-charcoal/20"
                />
              )}
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2" color="#b7c6c2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full rounded-2xl bg-cream py-3 pl-10 pr-4 text-sm font-bold text-charcoal outline-none sage-border-soft focus:ring-2 focus:ring-charcoal/20"
                />
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2" color="#b7c6c2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded-2xl bg-cream py-3 pl-10 pr-4 text-sm font-bold text-charcoal outline-none sage-border-soft focus:ring-2 focus:ring-charcoal/20"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-extrabold text-white transition-colors disabled:opacity-60"
                style={{ backgroundColor: "#ca0013" }}
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>
          ) : (
            <form onSubmit={otpSent ? verifyOtp : sendOtp} className="space-y-3">
              {!otpSent ? (
                <>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="rounded-2xl bg-cream px-3 py-3 text-sm font-bold text-charcoal outline-none sage-border-soft"
                    >
                      <option value="+91">🇮🇳 +91</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+61">🇦🇺 +61</option>
                      <option value="+971">🇦🇪 +971</option>
                      <option value="+65">🇸🇬 +65</option>
                    </select>
                    <div className="relative flex-1">
                      <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2" color="#b7c6c2" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Mobile number"
                        className="w-full rounded-2xl bg-cream py-3 pl-10 pr-4 text-sm font-bold text-charcoal outline-none sage-border-soft focus:ring-2 focus:ring-charcoal/20"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading || phone.length < 6}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-extrabold text-white disabled:opacity-60"
                    style={{ backgroundColor: "#ca0013" }}
                  >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    Send OTP
                  </button>
                </>
              ) : (
                <>
                  <p className="text-center text-xs font-bold" style={{ color: "#b7c6c2" }}>
                    OTP sent to {countryCode} {phone}
                  </p>
                  <div className="relative">
                    <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2" color="#b7c6c2" />
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="6-digit code"
                      className="w-full rounded-2xl bg-cream py-3 pl-10 pr-4 text-center text-lg font-black tracking-[0.4em] text-charcoal outline-none sage-border-soft focus:ring-2 focus:ring-charcoal/20"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || otp.length < 4}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-extrabold text-white disabled:opacity-60"
                    style={{ backgroundColor: "#ca0013" }}
                  >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    Verify & Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setOtp(""); }}
                    className="w-full text-center text-xs font-bold text-charcoal"
                  >
                    Change number
                  </button>
                </>
              )}
            </form>
          )}

          <div className="my-4 flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#b7c6c2" }}>
            <div className="h-px flex-1" style={{ backgroundColor: "rgba(183,198,194,0.4)" }} />
            or continue with
            <div className="h-px flex-1" style={{ backgroundColor: "rgba(183,198,194,0.4)" }} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleOAuth("google")}
              disabled={loading}
              className="rounded-2xl bg-white py-3 text-sm font-extrabold text-charcoal sage-border transition-colors hover:bg-cream"
            >
              Google
            </button>
            <button
              onClick={() => handleOAuth("apple")}
              disabled={loading}
              className="rounded-2xl py-3 text-sm font-extrabold text-white transition-colors"
              style={{ backgroundColor: "#171e19" }}
            >
              Apple
            </button>
          </div>
        </div>

        {authMode === "email" && (
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-5 w-full text-center text-sm font-bold text-charcoal"
          >
            {mode === "signin" ? (
              <>New to Nutrio? <span style={{ color: "#ca0013" }}>Create an account</span></>
            ) : (
              <>Have an account? <span style={{ color: "#ca0013" }}>Sign in</span></>
            )}
          </button>
        )}

        <p className="mt-6 text-center text-[10px] font-bold uppercase tracking-wider" style={{ color: "#b7c6c2" }}>
          <Link to="/">Back to home</Link>
        </p>
      </div>
    </div>
  );
}
