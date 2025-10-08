import React from 'react';
import { 
  BarChart, Bar, 
  LineChart, Line, 
  PieChart, Pie, 
  RadarChart, Radar,
  XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, Cell, 
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ReferenceLine 
} from 'recharts';
import '../styles/ButtonPresentation.css';

const DaycareAlertVisuals = () => {
  // Reddit traffic data
  const redditData = [
    { community: 'r/daddit', upvotes: 509, views: 82700, viewsK: 82.7 },
    { community: 'r/Dallas', upvotes: 547, views: 36000, viewsK: 36 },
    { community: 'r/FortWorth', upvotes: 373, views: 37700, viewsK: 37.7 },
    { community: 'r/frisco', upvotes: 399, views: 43800, viewsK: 43.8 },
  ];

  // User growth data
  const userGrowthData = [
    { date: 'Apr 11-15', users: 50, label: 'Launch' },
    { date: 'Apr 16-19', users: 200, label: 'First Growth' },
    { date: 'Apr 20-24', users: 800, label: 'Viral Posts' },
    { date: 'Apr 25-29', users: 1700, label: 'Current' },
    { date: 'May', users: 7500, label: 'Projected' },
    { date: 'Jun', users: 15000, label: 'Projected' },
    { date: 'Jul', users: 25000, label: 'Projected' },
  ];

  // Audience segments
  const audienceData = [
    { name: 'Active Daycare Searches', value: 45, fill: '#8884d8' },
    { name: 'Safety Research', value: 30, fill: '#82ca9d' },
    { name: 'Violation Lookups', value: 15, fill: '#ffc658' },
    { name: 'Price Comparisons', value: 10, fill: '#ff8042' },
  ];

  // Partnership benefit data
  const partnershipBenefits = [
    { name: 'Qualified Leads', firm: 85, platform: 45 },
    { name: 'Brand Authority', firm: 65, platform: 75 },
    { name: 'Resource Access', firm: 70, platform: 80 },
    { name: 'Market Insight', firm: 90, platform: 60 },
    { name: 'Public Awareness', firm: 75, platform: 70 },
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold text-center mb-8">DaycareAlert Partnership Presentation</h1>
      
      {/* Social Media Impact */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Reddit Growth Engine</h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-3">Community Engagement</h3>
            <div className="h-64">
              <BarChart
                width={380}
                height={250}
                data={redditData}
                margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="community" 
                  angle={-45} 
                  textAnchor="end" 
                  height={60} 
                  tick={{ fontSize: 12 }}
                />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip />
                <Legend wrapperStyle={{ paddingTop: 10 }} />
                <Bar yAxisId="left" dataKey="upvotes" fill="#8884d8" name="Upvotes" />
                <Bar yAxisId="right" dataKey="viewsK" fill="#82ca9d" name="Views (K)" />
              </BarChart>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-3">Key Statistics</h3>
            <ul className="space-y-3">
              <li className="flex justify-between">
                <span className="font-medium">Total Reddit Views:</span>
                <span className="font-bold text-blue-600">200,000+</span>
              </li>
              <li className="flex justify-between">
                <span className="font-medium">Total Upvotes:</span>
                <span className="font-bold text-blue-600">1,958</span>
              </li>
              <li className="flex justify-between">
                <span className="font-medium">Total Comments:</span>
                <span className="font-bold text-blue-600">279</span>
              </li>
              <li className="flex justify-between">
                <span className="font-medium">Conversion Rate:</span>
                <span className="font-bold text-blue-600">0.85%</span>
              </li>
              <li className="flex justify-between">
                <span className="font-medium">Communities Reached:</span>
                <span className="font-bold text-blue-600">7+</span>
              </li>
              <li className="flex justify-between border-t pt-2 mt-2">
                <span className="font-medium">Viral Post Success:</span>
                <span className="font-bold text-green-600">Exceptional</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* User Growth Chart */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Explosive User Growth</h2>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="h-64">
            <LineChart
              width={800}
              height={250}
              data={userGrowthData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              style={{ maxWidth: '100%' }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 'dataMax + 5000']} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="users" 
                stroke="#8884d8" 
                activeDot={{ r: 8 }} 
                strokeWidth={2}
              />
              <ReferenceLine 
                x="Apr 25-29" 
                stroke="green" 
                label={{ value: "Today", position: "top", fill: "green" }} 
              />
              <ReferenceLine 
                x="May" 
                stroke="red" 
                strokeDasharray="3 3" 
                label={{ value: "Projection", position: "top", fill: "red" }} 
              />
            </LineChart>
          </div>
          <div className="mt-4 text-sm text-gray-600 italic text-center">
            From launch to 1,700+ users in just 18 days
          </div>
        </div>
      </div>
      
      {/* User Intent & Partnership Benefits */}
      <div className="grid grid-cols-2 gap-6 mb-10">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">User Intent Analysis</h2>
          <div className="h-64 flex items-center justify-center">
            <PieChart width={300} height={250}>
              <Pie
                data={audienceData}
                cx={150}
                cy={120}
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
                label={false} // Remove direct labels on pie segments
              >
                {audienceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value}%`, name]} />
              <Legend 
                layout="vertical" 
                verticalAlign="middle" 
                align="right"
                wrapperStyle={{ paddingLeft: 20 }}
              />
            </PieChart>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Partnership Value Creation</h2>
          <div className="h-64">
            <RadarChart 
              cx={190} 
              cy={120} 
              outerRadius={75} 
              width={380} 
              height={250} 
              data={partnershipBenefits}
            >
              <PolarGrid />
              <PolarAngleAxis 
                dataKey="name" 
                tick={{ fontSize: 11, fill: '#333' }}
                style={{ fontSize: '10px' }}
              />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Radar 
                name="Button Law Firm" 
                dataKey="firm" 
                stroke="#8884d8" 
                fill="#8884d8" 
                fillOpacity={0.6} 
              />
              <Radar 
                name="DaycareAlert" 
                dataKey="platform" 
                stroke="#82ca9d" 
                fill="#82ca9d" 
                fillOpacity={0.6} 
              />
              <Legend layout="horizontal" verticalAlign="bottom" align="center" />
              <Tooltip />
            </RadarChart>
          </div>
        </div>
      </div>
      
      {/* Key Performance Metrics */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Platform Engagement Metrics</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-blue-700">2m 26s</div>
            <div className="text-sm font-medium text-blue-900">Avg. Session Time</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-green-700">24.18</div>
            <div className="text-sm font-medium text-green-900">Events Per User</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-purple-700">90.6%</div>
            <div className="text-sm font-medium text-purple-900">Engagement Rate</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-yellow-700">15K+</div>
            <div className="text-sm font-medium text-yellow-900">Page Views</div>
          </div>
        </div>
      </div>
      
      {/* Projected Lead Generation */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Projected Qualified Lead Generation</h2>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 border-b text-left">Timeframe</th>
                  <th className="py-2 px-4 border-b text-center">Monthly Users</th>
                  <th className="py-2 px-4 border-b text-center">Safety Concerns</th>
                  <th className="py-2 px-4 border-b text-center">Qualified Leads</th>
                  <th className="py-2 px-4 border-b text-center">Potential Cases</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2 px-4 border-b">Current</td>
                  <td className="py-2 px-4 border-b text-center">1,700</td>
                  <td className="py-2 px-4 border-b text-center">425</td>
                  <td className="py-2 px-4 border-b text-center">8-12</td>
                  <td className="py-2 px-4 border-b text-center">3-5</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 border-b">Q3 2025</td>
                  <td className="py-2 px-4 border-b text-center">25,000</td>
                  <td className="py-2 px-4 border-b text-center">6,250</td>
                  <td className="py-2 px-4 border-b text-center">120-150</td>
                  <td className="py-2 px-4 border-b text-center">30-45</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 border-b">Q4 2025</td>
                  <td className="py-2 px-4 border-b text-center">50,000</td>
                  <td className="py-2 px-4 border-b text-center">12,500</td>
                  <td className="py-2 px-4 border-b text-center">240-300</td>
                  <td className="py-2 px-4 border-b text-center">60-90</td>
                </tr>
                <tr className="bg-blue-50">
                  <td className="py-2 px-4 border-b font-medium">Year 1 Total</td>
                  <td className="py-2 px-4 border-b text-center">-</td>
                  <td className="py-2 px-4 border-b text-center">-</td>
                  <td className="py-2 px-4 border-b text-center font-bold">400-500</td>
                  <td className="py-2 px-4 border-b text-center font-bold">100-150</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-sm text-gray-600 italic">
            Assumptions: 25% of users have safety concerns, 2-3% convert to qualified leads, 25-30% become potential cases
          </div>
        </div>
      </div>
      
      {/* Partnership Implementation */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Partnership Implementation</h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-3">Integration Points</h3>
            <ul className="space-y-2">
              <li className="flex">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">1</div>
                <div className="ml-3">
                  <div className="font-medium">Legal Resource Center</div>
                  <div className="text-sm text-gray-600">Button Law authored guides on daycare safety and parent rights</div>
                </div>
              </li>
              <li className="flex">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">2</div>
                <div className="ml-3">
                  <div className="font-medium">Expert Q&A Section</div>
                  <div className="text-sm text-gray-600">Monthly featured answers to parent questions</div>
                </div>
              </li>
              <li className="flex">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">3</div>
                <div className="ml-3">
                  <div className="font-medium">Safety Alert System</div>
                  <div className="text-sm text-gray-600">Legal guidance on critical violations</div>
                </div>
              </li>
              <li className="flex">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">4</div>
                <div className="ml-3">
                  <div className="font-medium">Consultation Referrals</div>
                  <div className="text-sm text-gray-600">Contextual referrals for parents with concerns</div>
                </div>
              </li>
            </ul>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-3">Timeline & Milestones</h3>
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300"></div>
              <ul className="space-y-6">
                <li className="flex">
                  <div className="flex-shrink-0 w-16 text-xs text-right pr-2">Week 1-2</div>
                  <div className="flex-shrink-0 w-4 h-4 rounded-full bg-green-500 mt-1 z-10"></div>
                  <div className="ml-3">
                    <div className="font-medium">Platform Exploration</div>
                    <div className="text-xs text-gray-600">Button Law team reviews site functionality</div>
                  </div>
                </li>
                <li className="flex">
                  <div className="flex-shrink-0 w-16 text-xs text-right pr-2">Week 3-4</div>
                  <div className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-500 mt-1 z-10"></div>
                  <div className="ml-3">
                    <div className="font-medium">Content Planning</div>
                    <div className="text-xs text-gray-600">Identify key resources to develop</div>
                  </div>
                </li>
                <li className="flex">
                  <div className="flex-shrink-0 w-16 text-xs text-right pr-2">Month 2</div>
                  <div className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-500 mt-1 z-10"></div>
                  <div className="ml-3">
                    <div className="font-medium">Initial Integration</div>
                    <div className="text-xs text-gray-600">First content goes live on platform</div>
                  </div>
                </li>
                <li className="flex">
                  <div className="flex-shrink-0 w-16 text-xs text-right pr-2">Month 3</div>
                  <div className="flex-shrink-0 w-4 h-4 rounded-full bg-gray-500 mt-1 z-10"></div>
                  <div className="ml-3">
                    <div className="font-medium">Performance Review</div>
                    <div className="text-xs text-gray-600">Assess initial results and optimize</div>
                  </div>
                </li>
                <li className="flex">
                  <div className="flex-shrink-0 w-16 text-xs text-right pr-2">Month 6</div>
                  <div className="flex-shrink-0 w-4 h-4 rounded-full bg-gray-500 mt-1 z-10"></div>
                  <div className="ml-3">
                    <div className="font-medium">Full Implementation</div>
                    <div className="text-xs text-gray-600">Complete integration across platform</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DaycareAlertVisuals;
