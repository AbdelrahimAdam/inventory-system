import React, { useState, useEffect } from 'react';

type User = {
  id: number;
  name: string;
  role: string;
};

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');

  useEffect(() => {
    const storedUsers = JSON.parse(localStorage.getItem('users') || '[]');
    setUsers(storedUsers);
  }, []);

  const addUser = () => {
    if (!name || !role) return;
    const newUser = {
      id: Date.now(),
      name,
      role,
    };
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem('users', JSON.stringify(updatedUsers));
    setName('');
    setRole('');
  };

  return (
    <div className="p-8 text-right">
      <h2 className="text-2xl font-bold mb-6 text-sudanPrimary">👥 إدارة المستخدمين</h2>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="اسم المستخدم"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="p-2 border rounded w-full md:w-1/3 text-right"
        />
        <input
          type="text"
          placeholder="الدور (مثل: مشرف، مدير)"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="p-2 border rounded w-full md:w-1/3 text-right"
        />
        <button
          onClick={addUser}
          className="bg-sudanPrimary text-white rounded px-4 py-2 hover:bg-opacity-90"
        >
          ➕ إضافة مستخدم
        </button>
      </div>

      {users.length === 0 ? (
        <p className="text-gray-500">لا يوجد مستخدمون حتى الآن.</p>
      ) : (
        <table className="min-w-full border text-center">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">الاسم</th>
              <th className="p-2 border">الدور</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="p-2 border">{user.name}</td>
                <td className="p-2 border">{user.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default UsersPage;
