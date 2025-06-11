// src/components/DebugUsersView.tsx
import React, { useState, useEffect } from "react";
import { getUsers, saveUsers } from "../utils/localStorageService";

const DebugUsersView: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    setUsers(getUsers());
  }, []);

  const handleClear = () => {
    saveUsers([]);
    setUsers([]);
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-gray-50 rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Encrypted Users Debug View</h2>

      {users.length === 0 ? (
        <p className="text-gray-600">No users found in localStorage.</p>
      ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="border px-2 py-1">ID</th>
              <th className="border px-2 py-1">Name</th>
              <th className="border px-2 py-1">Email</th>
              <th className="border px-2 py-1">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="border px-2 py-1">{u.id}</td>
                <td className="border px-2 py-1">{u.name}</td>
                <td className="border px-2 py-1">{u.email}</td>
                <td className="border px-2 py-1">{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button
        onClick={handleClear}
        className="mt-4 bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition"
      >
        Clear All Users
      </button>
    </div>
  );
};

export default DebugUsersView;
