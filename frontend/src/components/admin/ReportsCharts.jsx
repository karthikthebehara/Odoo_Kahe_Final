import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

export const SalesAreaChart = ({ data }) => {
  // Map backend trend segments to chart data
  const chartData = (data || []).map(item => ({
    time: item.segment,
    revenue: parseFloat(item.revenue)
  }));

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={true} opacity={0.3} />
          <XAxis 
            dataKey="time" 
            stroke="#9ca3af" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false}
            tick={{ fill: '#9ca3af', fontWeight: 'bold' }}
          />
          <YAxis 
            stroke="#9ca3af" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false}
            tickFormatter={(val) => `₹${val}`}
            tick={{ fill: '#9ca3af', fontWeight: 'bold' }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px' }}
            itemStyle={{ color: '#f3f4f6', fontSize: '12px' }}
            labelStyle={{ color: '#9ca3af', fontSize: '10px', marginBottom: '4px' }}
          />
          <Area 
            type="linear" 
            dataKey="revenue" 
            stroke="#3b82f6" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorRev)" 
            dot={{ r: 4, fill: '#3b82f6', stroke: '#1e3a8a', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: '#60a5fa', stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const CategoryPieChart = ({ data }) => {
  const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6'];
  
  const chartData = (data || []).map(item => ({
    name: item.category_name,
    value: parseFloat(item.revenue)
  }));

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px' }}
            itemStyle={{ color: '#f3f4f6', fontSize: '12px' }}
          />
          <Legend 
            verticalAlign="bottom" 
            align="center"
            wrapperStyle={{ paddingTop: '20px', fontSize: '10px', color: '#9ca3af' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
