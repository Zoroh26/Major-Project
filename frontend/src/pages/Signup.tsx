

import React, { useState } from "react";
import { AlertCircle, Loader, Eye, EyeOff, CheckCircle } from "lucide-react";
import { useAuthStore } from "../store/auth";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const Signup: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<{ 
    email?: string; 
    password?: string;
    confirmPassword?: string;
  }>({});
  const signup = useAuthStore((state) => state.signup);
  const loading = useAuthStore((state) => state.loading);
  const navigate = useNavigate();

  // Clear form errors when user starts typing
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (formErrors.email) {
      setFormErrors((prev) => ({ ...prev, email: undefined }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (formErrors.password) {
      setFormErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    if (formErrors.confirmPassword) {
      setFormErrors((prev) => ({ ...prev, confirmPassword: undefined }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string; confirmPassword?: string } = {};

    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    } else if (!/[A-Z]/.test(password)) {
      errors.password = "Password must contain at least one uppercase letter";
    } else if (!/[0-9]/.test(password)) {
      errors.password = "Password must contain at least one number";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await signup({ email, password });
      toast.success("Account created! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1000);
    } catch (err: any) {
      const errorMessage = 
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Signup failed. Please try again.";
      
      toast.error(errorMessage);
    }
  };

  const passwordStrength = password
    ? {
        has8Chars: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasNumber: /[0-9]/.test(password),
      }
    : null;

  const _isPasswordValid = passwordStrength &&
    passwordStrength.has8Chars &&
    passwordStrength.hasUppercase &&
    passwordStrength.hasNumber;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 bg-card rounded-lg shadow-lg border-2 border-primary">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-center text-primary mb-2">Create Account</h2>
          <p className="text-center text-gray-400 text-sm">Join us to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
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
              } text-white placeholder-gray-500 disabled:opacity-50`}
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
                } text-white placeholder-gray-500 disabled:opacity-50`}
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

            {/* Password Requirements */}
            {password && (
              <div className="mt-2 space-y-1 text-xs">
                <div className={`flex items-center gap-2 ${passwordStrength?.has8Chars ? "text-green-500" : "text-gray-500"}`}>
                  <CheckCircle size={14} />
                  At least 8 characters
                </div>
                <div className={`flex items-center gap-2 ${passwordStrength?.hasUppercase ? "text-green-500" : "text-gray-500"}`}>
                  <CheckCircle size={14} />
                  One uppercase letter
                </div>
                <div className={`flex items-center gap-2 ${passwordStrength?.hasNumber ? "text-green-500" : "text-gray-500"}`}>
                  <CheckCircle size={14} />
                  One number
                </div>
              </div>
            )}

            {formErrors.password && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={14} />
                {formErrors.password}
              </p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-primary mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                placeholder="••••••••"
                disabled={loading}
                className={`w-full px-4 py-2 border-2 rounded-lg transition focus:outline-none pr-10 ${
                  formErrors.confirmPassword
                    ? "border-red-500 bg-red-500/5 focus:border-red-600"
                    : password && confirmPassword === password
                    ? "border-green-500/50 bg-background focus:border-green-500"
                    : "border-primary/30 bg-background focus:border-primary"
                } text-white placeholder-gray-500 disabled:opacity-50`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition disabled:opacity-50"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {formErrors.confirmPassword && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={14} />
                {formErrors.confirmPassword}
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
                Creating account...
              </>
            ) : (
              "Sign Up"
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className="mt-6 text-center">
          <span className="text-gray-400">Already have an account? </span>
          <a
            href="/login"
            className="text-primary hover:text-primary/80 font-medium transition"
          >
            Login
          </a>
        </div>
      </div>
    </div>
  );
};

export default Signup;
