import React from "react";
import CountUp from "react-countup";

const StatCard = ({ label, value, icon }) => (
  <div className="bg-white dark:bg-emerald-900 shadow-lg rounded-xl p-6 flex flex-col items-center justify-center transition-transform hover:scale-105 focus-within:scale-105 outline-none" tabIndex={0} aria-label={label}>
    <div className="text-4xl mb-2">{icon}</div>
    <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-200 mb-1">
      <CountUp end={value} duration={2} />
    </div>
    <div className="text-lg text-gray-700 dark:text-gray-100 font-medium">{label}</div>
  </div>
);

export default StatCard; 