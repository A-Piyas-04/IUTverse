import React from "react";

export default function SimpleHomepage() {
  return (
    <div className="w-full h-screen bg-white">
      <div className="p-8">
        <h1 className="text-3xl font-bold text-green-700 mb-4">Welcome to IUTverse</h1>
        <p className="text-gray-600">This is a simplified homepage to test the app.</p>
        <div className="mt-4">
          <a href="/login" className="text-blue-500 underline mr-4">Login</a>
          <a href="/signup" className="text-blue-500 underline">Signup</a>
        </div>
      </div>
    </div>
  );
}
