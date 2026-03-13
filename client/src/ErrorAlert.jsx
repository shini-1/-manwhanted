import React from 'react';

export default function ErrorAlert({ message }) {
  return <div className="bg-red-600 text-white p-4 rounded">{message}</div>;
}