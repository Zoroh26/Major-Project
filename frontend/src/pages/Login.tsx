
import React, { useState, useEffect } from "react";
import { AlertCircle, Loader, Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "../store/auth";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const navigate = useNavigate();

  // Clear form errors when user starts typing
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (formErrors.email) {
      setFormErrors((prev) => ({ ...prev, email: undefined }));
    }
    if (serverError) {
      setServerError(null);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (formErrors.password) {
      setFormErrors((prev) => ({ ...prev, password: undefined }));
    }
    if (serverError) {
      setServerError(null);
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 1) {
      errors.password = "Password must not be empty";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    
    if (!validateForm()) {
      return;
    }

    try {
      await login({ email, password });
      toast.success("Login successful! Redirecting...");
      setTimeout(() => navigate("/dashboard"), 500);
    } catch (err: any) {
      // Extract HTTP status code
      const statusCode = err?.response?.status;
      const statusText = err?.response?.statusText;
      
      // Extract error message from various possible locations
      let errorMessage = 
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Login failed. Please check your credentials.";

      // Format error with status code
      if (statusCode) {
        errorMessage = `Error ${statusCode}${statusText ? ` (${statusText})` : ''}: ${errorMessage}`;
      }
      
      setServerError(errorMessage);
      toast.error(errorMessage);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 bg-card rounded-lg shadow-lg border-2 border-primary">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-center text-primary mb-2">Welcome Back</h2>
          <p className="text-center text-gray-400 text-sm">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Server Error Display */}
          {serverError && (
            <div className="bg-red-500/10 border-2 border-red-500 text-red-400 px-4 py-3 rounded-lg flex items-start gap-3">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Login Failed</p>
                <p className="text-xs mt-1">{serverError}</p>
              </div>
            </div>
          )}

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-primary mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="you@example.com"
              disabled={loading}
              className={`w-full px-4 py-2 border-2 rounded-lg transition focus:outline-none ${
                formErrors.email
                  ? "border-red-500 bg-red-500/5 focus:border-red-600"
                  : "border-primary/30 bg-background focus:border-primary"
              } text-black placeholder-gray-500 disabled:opacity-50`}
            />
            {formErrors.email && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={14} />
                {formErrors.email}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-primary mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={handlePasswordChange}
                placeholder="••••••••"
                disabled={loading}
                className={`w-full px-4 py-2 border-2 rounded-lg transition focus:outline-none pr-10 ${
                  formErrors.password
                    ? "border-red-500 bg-red-500/5 focus:border-red-600"
                    : "border-primary/30 bg-background focus:border-primary"
                } text-black placeholder-gray-500 disabled:opacity-50`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition disabled:opacity-50"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {formErrors.password && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={14} />
                {formErrors.password}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-primary hover:bg-primary/80 disabled:bg-primary/50 text-background font-semibold rounded-lg shadow transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader size={18} className="animate-spin" />
                Logging in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Sign Up Link */}
        <div className="mt-6 text-center">
          <span className="text-gray-400">Don't have an account? </span>
          <a
            href="/signup"
            className="text-primary hover:text-primary/80 font-medium transition"
          >
            Sign up
          </a>
        </div>

      </div>
    </div>
  );
};

export default Login;
