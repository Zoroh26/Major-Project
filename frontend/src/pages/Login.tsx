import React, { useState } from "react";
import { AlertCircle, Loader, Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "../store/auth";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const navigate = useNavigate();

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: undefined }));
    if (serverError) setServerError(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (formErrors.password) setFormErrors((prev) => ({ ...prev, password: undefined }));
    if (serverError) setServerError(null);
  };

  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Please enter a valid email";
    if (!password) errors.password = "Password is required";
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    if (!validateForm()) return;

    try {
      await login({ email, password });
      toast.success("Login successful! Redirecting...");
      setTimeout(() => navigate("/dashboard"), 500);
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Login failed. Please check your credentials.";
      setServerError(errorMessage);
      toast.error(errorMessage);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-surface p-4 relative overflow-hidden">
      {/* Abstract Background Design Element */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-container opacity-[0.03] rounded-full blur-3xl pointer-events-none" />
      
      <Card className="w-full max-w-md p-8 md:p-10 relative z-10">
        <div className="mb-8 text-center text-primary">
          <h1 className="text-3xl font-extrabold tracking-tight mb-1">CrowdVision</h1>
          <p className="text-sm font-medium tracking-widest text-primary/70 uppercase">Command Center Access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {serverError && (
            <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded text-sm flex items-start gap-3">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Access Denied</p>
                <p className="text-xs opacity-90 mt-0.5">{serverError}</p>
              </div>
            </div>
          )}

          <div>
            <Input
              label="Identification (Email)"
              type="email"
              id="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="you@example.com"
              disabled={loading}
              className={formErrors.email ? "border-error focus:border-error bg-error/5" : ""}
            />
            {formErrors.email && (
              <p className="mt-1 text-xs text-error flex items-center gap-1">
                <AlertCircle size={12} /> {formErrors.email}
              </p>
            )}
          </div>

          <div>
            <div className="relative">
              <Input
                label="Clearance Code (Password)"
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={handlePasswordChange}
                placeholder="••••••••"
                disabled={loading}
                className={formErrors.password ? "border-error focus:border-error bg-error/5 pr-10" : "pr-10"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                className="absolute right-3 top-[34px] text-primary/40 hover:text-primary transition disabled:opacity-50"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {formErrors.password && (
              <p className="mt-1 text-xs text-error flex items-center gap-1">
                <AlertCircle size={12} /> {formErrors.password}
              </p>
            )}
          </div>

          

          <Button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 mt-4 py-2.5">
            {loading ? (
              <><Loader size={16} className="animate-spin" /> Authenticating...</>
            ) : (
              "Initialize Session"
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Login;
