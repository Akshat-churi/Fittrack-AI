import React from 'react';

const StatCard = ({ title, value, icon: Icon, colorClass = 'text-brand-orange' }) => (
  <div className="glass rounded-2xl p-4 flex items-center justify-between border border-zinc-800/40 hover:border-brand-orange/20 transition-all">
    <div>
      <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">{title}</p>
      <p className={`text-2xl font-black tracking-tight ${colorClass}`}>{value}</p>
    </div>
    <div className={`w-10 h-10 rounded-xl bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center shrink-0 ${colorClass}`}>
      <Icon className="w-5 h-5"/>
    </div>
  </div>
);

export default StatCard;
