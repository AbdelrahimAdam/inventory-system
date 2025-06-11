// src/components/UserCard.tsx
import React from "react";

interface UserCardProps {
  name: string;
  role: string;
  email: string;
}

const UserCard: React.FC<UserCardProps> = ({ name, role, email }) => {
  return (
    <div className="bg-white shadow rounded-lg p-4 text-right" dir="rtl">
      <h3 className="text-lg font-bold text-gray-800">{name}</h3>
      <p className="text-sm text-gray-600">الدور: {role}</p>
      <p className="text-sm text-gray-600">البريد الإلكتروني: {email}</p>
    </div>
  );
};

export default UserCard;
