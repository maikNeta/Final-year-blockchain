import React from "react";

export function Progress({ value }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
      <div
        className="bg-green-500 h-full transition-all duration-500 ease-out"
        style={{ width: `${value}%` }}
      ></div>
    </div>
  );
}
