

import React, { useState } from "react";
import { useAuthStore } from "../store/auth";
import { useNavigate } from "react-router-dom";

const Signup: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const signup = useAuthStore((state) => state.signup);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const navigate = useNavigate();

  const [success, setSuccess] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccess(false);
    try {
      await signup({ email, password });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err: any) {
      setFormError(err?.response?.data?.message || err?.message || "Signup failed");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 bg-card rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-center text-primary">Sign Up</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-primary">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-2 border border-primary/30 rounded-md shadow-sm focus:ring-primary focus:border-primary text-primary"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-primary">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-2 border border-primary/30 rounded-md shadow-sm focus:ring-primary focus:border-primary text-primary"
            />
          </div>
          {(formError || error) && (
            <div className="text-red-600 text-sm text-center">{formError || error}</div>
          )}
          {success && (
            <div className="text-green-600 text-sm text-center">Signup successful! Please log in.</div>
          )}
          <button
            type="submit"
            className="w-full py-2 px-4 bg-primary hover:bg-primary/90 text-background font-semibold rounded-md shadow focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          >
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>
        <div className="mt-6 text-center">
          <span className="text-primary/70">Already a user? </span>
          <a href="/login" className="text-primary hover:underline">Login</a>
        </div>
      </div>
    </div>
  );
};

export default Signup;
