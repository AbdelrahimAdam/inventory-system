// src/components/RegistrationForm.tsx
import React, { useState } from "react";
import { saveUsers, getUsers } from "../utils/localStorageService";

const RegistrationForm: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("buyer");
  const [message, setMessage] = useState<string | null>(null);

  const roles = ["manager", "supplier", "worker", "buyer"];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Basic validation
    if (!name || !email || !password) {
      setMessage("Please fill in all fields");
      return;
    }

    const users = getUsers();

    // Check if email already exists
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      setMessage("Email is already registered");
      return;
    }

    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      password,
      role,
    };

    users.push(newUser);
    saveUsers(users);

    setMessage("User registered successfully!");
    setName("");
    setEmail("");
    setPassword("");
    setRole("buyer");
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Register New User</h2>

      {message && (
        <div
          className={`mb-4 p-2 rounded ${
            message.includes("success") ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"
          }`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Name"
          className="w-full p-2 border rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 border rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full p-2 border rounded"
        >
          {roles.map((r) => (
            <option key={r} value={r}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Register
        </button>
      </form>
    </div>
  );
};

export default RegistrationForm;
