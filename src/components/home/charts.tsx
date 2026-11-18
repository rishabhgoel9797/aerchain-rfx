"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const axis = { fontSize: 11, fill: "#6b6f80" };

export function SpendChart({ data }: { data: { category: string; cr: number }[] }) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
          <XAxis type="number" tick={axis} axisLine={false} tickLine={false} unit=" Cr" />
          <YAxis type="category" dataKey="category" tick={axis} axisLine={false} tickLine={false} width={86} />
          <Tooltip formatter={(v) => [`₹${v} Cr`, "Being sourced"]} cursor={{ fill: "rgba(55,49,146,0.06)" }} />
          <Bar dataKey="cr" fill="#2f80ed" radius={[0, 6, 6, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SavingsChart({ data }: { data: { month: string; lakh: number }[] }) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
          <XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} />
          <YAxis tick={axis} axisLine={false} tickLine={false} />
          <Tooltip formatter={(v) => [`₹${v} L`, "Saved"]} cursor={{ fill: "rgba(55,49,146,0.06)" }} />
          <Bar dataKey="lakh" fill="#11795a" radius={[6, 6, 0, 0]} barSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
