// src/components/UserCard.tsx
import React from 'react';
import type { User } from '../types/user';

interface Props {
  user: User;
}

export const UserCard: React.FC<Props> = ({ user }) => (
  <div className="user-card">
    {user.profileImage && <img src={user.profileImage} alt={user.name} />}
    <h2>{user.name}</h2>
    <p>{user.email}</p>
    <span>{user.role}</span>
  </div>
);
