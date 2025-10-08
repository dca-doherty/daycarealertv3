import React, { useState } from 'react';
import { 
  BarChart, Bar, 
  LineChart, Line, 
  PieChart, Pie, 
  RadarChart, Radar,
  XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, Cell, 
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ReferenceLine,
  AreaChart, Area,
  ComposedChart
} from 'recharts';
import '../styles/EnhancedButtonPresentation.css';

const EnhancedButtonPresentation = () => {
  const [activeTab, setActiveTab] = useState('visuals');

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
  
  // Revenue Projection Data (3-Year)
  const revenueProjectionData = [
    { year: 'Year 1', dataLicensing: 0.5, daycareListing: 0.5, daycareTuition: 0.5, legalReferrals: 0.4, insuranceData: 1.0, marketplace: 0.25, total: 3.15 },
    { year: 'Year 2', dataLicensing: 1.5, daycareListing: 1.2, daycareTuition: 1.5, legalReferrals: 1.2, insuranceData: 2.0, marketplace: 0.8, total: 8.2 },
    { year: 'Year 3', dataLicensing: 3.0, daycareListing: 2.0, daycareTuition: 2.5, legalReferrals: 2.0, insuranceData: 3.5, marketplace: 1.5, total: 14.5 },
  ];
  
  // Geographic Expansion Timeline
  const geographicExpansionData = [
    { phase: 'Phase 1', year: 'Year 1', states: 1, coverage: 8, stateLabel: 'Texas' },
    { phase: 'Phase 2', year: 'Year 2 Q1-Q2', states: 2, coverage: 20, stateLabel: 'FL, CA' },
    { phase: 'Phase 3', year: 'Year 2 Q3-Q4', states: 3, coverage: 32, stateLabel: 'NY, IL, PA' },
    { phase: 'Phase 4', year: 'Year 3 Q1-Q2', states: 4, coverage: 44, stateLabel: 'GA, NC, OH, MI' },
    { phase: 'Phase 5', year: 'Year 3 Q3-Q4', states: 5, coverage: 60, stateLabel: 'WA, MA, VA, CO, AZ' },
    { phase: 'Phase 6', year: 'Year 4', states: 15, coverage: 90, stateLabel: 'Midwest & South' },
    { phase: 'Phase 7', year: 'Year 5', states: 20, coverage: 100, stateLabel: 'Remaining states' },
  ];
  
  // Legal Support Funnel
  const legalSupportFunnelData = [
    { value: 100, name: 'Parents with Safety Concerns', fill: '#8884d8' },
    { value: 40, name: 'Seeking Legal Information', fill: '#83a6ed' },
    { value: 25, name: 'Consultation Requests', fill: '#8dd1e1' },
    { value: 15, name: 'Qualified Consultations', fill: '#82ca9d' },
    { value: 5, name: 'Representation Cases', fill: '#a4de6c' },
  ];

  const renderTabContent = () => {
    switch(activeTab) {
      case 'visuals':
        return renderVisualsContent();
      case 'agenda':
        return renderAgendaContent();
      case 'metrics':
        return renderMetricsContent();
      case 'value':
        return renderValueContent();
      case 'structure':
        return renderStructureContent();
      case 'nextSteps':
        return renderNextStepsContent();
      default:
        return renderVisualsContent();
    }
  };

  const renderVisualsContent = () => {
    return (
      <>
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
                  label={{ value: "Today", position: "insideTopRight", fill: "green", fontSize: 12 }} 
                />
                <ReferenceLine 
                  x="May" 
                  stroke="red" 
                  strokeDasharray="3 3" 
                  label={{ value: "Projection", position: "insideTopRight", fill: "red", fontSize: 12 }} 
                />
              </LineChart>
            </div>
            <div className="mt-4 text-sm text-gray-600 italic text-center">
              From launch to 1,700+ users in just 18 days
            </div>
          </div>
        </div>
        
        {/* Revenue Projection Graph */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-4 mobile-text-center">Revenue Projection (3-Year Growth)</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="h-64">
              <AreaChart
                width={800}
                height={250}
                data={revenueProjectionData}
                margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                style={{ maxWidth: '100%' }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis 
                  label={{ 
                    value: 'Revenue ($ Millions)', 
                    angle: -90, 
                    position: 'insideLeft', 
                    style: { textAnchor: 'middle' }
                  }} 
                  domain={[0, 16]}
                />
                <Tooltip formatter={(value) => [`$${value}M`, '']} />
                <Legend />
                <Area type="monotone" dataKey="dataLicensing" stackId="1" stroke="#8884d8" fill="#8884d8" name="Data Licensing" />
                <Area type="monotone" dataKey="daycareListing" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Daycare Listings" />
                <Area type="monotone" dataKey="daycareTuition" stackId="1" stroke="#ffc658" fill="#ffc658" name="Daycare Referrals" />
                <Area type="monotone" dataKey="legalReferrals" stackId="1" stroke="#ff8042" fill="#ff8042" name="Legal Referrals" />
                <Area type="monotone" dataKey="insuranceData" stackId="1" stroke="#8dd1e1" fill="#8dd1e1" name="Insurance Data" />
                <Area type="monotone" dataKey="marketplace" stackId="1" stroke="#a4de6c" fill="#a4de6c" name="Marketplace Revenue" />
              </AreaChart>
            </div>
            <div className="mt-4 text-sm text-gray-600 italic text-center">
              Projected revenue growth with diversified income streams (free for parents)
            </div>
          </div>
        </div>

        {/* Geographic Expansion Timeline */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-4 mobile-text-center">Geographic Expansion Timeline</h2>
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="h-64">
                <ComposedChart
                  width={800}
                  height={250}
                  data={geographicExpansionData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                  style={{ maxWidth: '100%' }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="phase" 
                    angle={-45} 
                    textAnchor="end" 
                    height={60} 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    yAxisId="left" 
                    orientation="left" 
                    stroke="#8884d8"
                    label={{ 
                      value: 'States Added', 
                      angle: -90, 
                      position: 'insideLeft', 
                      style: { textAnchor: 'middle' } 
                    }}
                    domain={[0, 25]}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    stroke="#82ca9d"
                    label={{ 
                      value: 'National Coverage (%)', 
                      angle: 90, 
                      position: 'insideRight', 
                      style: { textAnchor: 'middle' } 
                    }}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    formatter={(value, name) => {
                      return [
                        name === 'States Added' ? 
                          `${value}` : 
                          `${value}%`, 
                        name
                      ];
                    }} 
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="states" fill="#8884d8" name="States Added" />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="coverage" 
                    stroke="#82ca9d" 
                    strokeWidth={2}
                    name="National Coverage (%)"
                  />
                </ComposedChart>
              </div>
              <div className="mt-4 text-sm text-gray-600 italic text-center">
                Button Law partnership can grow alongside DaycareAlert's nationwide expansion
              </div>
            </div>
          </div>
        </div>
        
        {/* Legal Support Opportunities Funnel */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-4 mobile-text-center">Legal Support Conversion Funnel</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="h-64">
                <PieChart width={300} height={250}>
                  <Pie
                    data={legalSupportFunnelData}
                    cx={150}
                    cy={120}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {legalSupportFunnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}%`, '']} />
                  <Legend 
                    layout="vertical" 
                    align="right" 
                    verticalAlign="middle" 
                    wrapperStyle={{ right: -310, top: 61 }}
                  />
                </PieChart>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-4 mobile-text-center">Conversion Metrics</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">Safety Concern to Legal Info</span>
                    <span className="text-blue-600 font-bold">40%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '40%' }}></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">4 in 10 parents with safety concerns seek legal information</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">Information to Consultation</span>
                    <span className="text-green-600 font-bold">62.5%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-green-600 h-2.5 rounded-full" style={{ width: '62.5%' }}></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Almost 2/3 of parents seeking information request a consultation</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">Qualified Consultation Rate</span>
                    <span className="text-purple-600 font-bold">60%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">60% of consultation requests become qualified consultations</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">Consultation to Representation</span>
                    <span className="text-yellow-600 font-bold">33.3%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-yellow-600 h-2.5 rounded-full" style={{ width: '33.3%' }}></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">1 in 3 qualified consultations become representation cases</p>
                </div>
              </div>
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
                  cx={85}
                  cy={120}
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={false}
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
                  wrapperStyle={{ right: -120, top: 0 }}
                  iconType="circle"
                  fontSize={11}
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
              <div className="text-3xl font-bold text-blue-700">5m 40s</div>
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
                    <div className="flex-shrink-0 w-16 text-xs text-right pr-2 whitespace-nowrap">Week 3-4</div>
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
      </>
    );
  };

  const renderAgendaContent = () => {
    return (
      <div className="bg-gray-50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Strategic Partnership Meeting Agenda</h2>
        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 pl-4 py-2">
            <h3 className="font-medium text-lg">Opening Narrative: My Story With Impact (5 minutes)</h3>
            <ul className="list-disc ml-5 mt-2 text-gray-700">
              <li>Personal Experience with Everett's daycare</li>
              <li>Key Realization about information accessibility</li>
              <li>Mission Created: Building DaycareAlert</li>
            </ul>
          </div>
          
          <div className="border-l-4 border-blue-500 pl-4 py-2">
            <h3 className="font-medium text-lg">DaycareAlert: Demonstrated Traction & Growth (7-10 minutes)</h3>
            <ul className="list-disc ml-5 mt-2 text-gray-700">
              <li>Platform Overview</li>
              <li>Growth Metrics</li>
              <li>User Engagement</li>
              <li>Parent Response</li>
            </ul>
          </div>
          
          <div className="border-l-4 border-blue-500 pl-4 py-2">
            <h3 className="font-medium text-lg">Value Creation for The Button Law Firm (10 minutes)</h3>
            <ul className="list-disc ml-5 mt-2 text-gray-700">
              <li>Alignment of Missions</li>
              <li>Qualified Lead Generation</li>
              <li>Trust & Authority Enhancement</li>
              <li>Data Intelligence & Trend Analysis</li>
            </ul>
          </div>
          
          <div className="border-l-4 border-blue-500 pl-4 py-2">
            <h3 className="font-medium text-lg">Proposed Partnership Structure (7-10 minutes)</h3>
            <ul className="list-disc ml-5 mt-2 text-gray-700">
              <li>Content Collaboration</li>
              <li>Technical & Legal Collaboration</li>
              <li>Cross-Promotion Opportunities</li>
            </ul>
          </div>
          
          <div className="border-l-4 border-blue-500 pl-4 py-2">
            <h3 className="font-medium text-lg">What DaycareAlert Needs From Button Law (5 minutes)</h3>
            <ul className="list-disc ml-5 mt-2 text-gray-700">
              <li>Legal Content Expertise</li>
              <li>Advisory Support</li>
              <li>Credibility Endorsement</li>
              <li>Media Connections</li>
              <li>Regulatory Insights</li>
            </ul>
          </div>
          
          <div className="border-l-4 border-blue-500 pl-4 py-2">
            <h3 className="font-medium text-lg">Questions to Explore Together (10 minutes)</h3>
            <p className="text-gray-700 mt-1">Seven key questions for discussion</p>
          </div>
          
          <div className="border-l-4 border-blue-500 pl-4 py-2">
            <h3 className="font-medium text-lg">Partnership Benefits Summary (3 minutes)</h3>
            <ul className="list-disc ml-5 mt-2 text-gray-700">
              <li>Benefits for Button Law Firm</li>
              <li>Benefits for DaycareAlert</li>
            </ul>
          </div>
          
          <div className="border-l-4 border-blue-500 pl-4 py-2">
            <h3 className="font-medium text-lg">Long-Term Vision & Strategic Alignment (5 minutes)</h3>
            <ul className="list-disc ml-5 mt-2 text-gray-700">
              <li>Mutually Reinforcing Growth</li>
              <li>Complementary Services & Resources</li>
              <li>Shared Commitment to Child Safety</li>
            </ul>
          </div>
          
          <div className="border-l-4 border-blue-500 pl-4 py-2">
            <h3 className="font-medium text-lg">Next Steps Proposal (3 minutes)</h3>
            <p className="text-gray-700 mt-1">Six actionable next steps to initiate partnership</p>
          </div>
        </div>
      </div>
    );
  };


  const renderMetricsContent = () => {
    return (
      <div className="bg-gray-50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">DaycareAlert: Demonstrated Traction & Growth</h2>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Platform Overview</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-blue-500 text-2xl mb-2"><span role="img" aria-label="Data chart">📊</span></div>
              <h4 className="font-medium mb-1">Centralized Database</h4>
              <p className="text-sm text-gray-600">Comprehensive collection of daycare violations, licensing status, and safety information</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-blue-500 text-2xl mb-2"><span role="img" aria-label="Mother and daughter">👩‍</span></div>
              <h4 className="font-medium mb-1">User-Friendly Interface</h4>
              <p className="text-sm text-gray-600">Designed for parents to make informed decisions quickly and confidently</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-blue-500 text-2xl mb-2"><span role="img" aria-label="Notification bell">🔔</span></div>
              <h4 className="font-medium mb-1">Automatic Alerts</h4>
              <p className="text-sm text-gray-600">Real-time notifications for parents when new violations occur at their child's facility</p>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Remarkable Growth Metrics</h3>
          
          <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
            <h4 className="font-medium mb-2">Launch Success</h4>
            <p>Site launched April 11, 2025 (18 days ago) and already has <span className="font-bold text-blue-600">1,700+ active users</span></p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
            <h4 className="font-medium mb-2">Viral Engagement</h4>
            <ul className="list-disc ml-5 space-y-1">
              <li><span className="font-medium">200,000+</span> views across Reddit posts sharing my story</li>
              <li><span className="font-medium">82,700</span> views on r/daddit post alone</li>
              <li><span className="font-medium">1,958</span> combined upvotes across Texas-focused communities</li>
              <li><span className="font-medium">547</span> upvotes on r/Dallas, 509 on r/daddit, 399 on r/frisco</li>
            </ul>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
            <h4 className="font-medium mb-2">User Engagement</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">5m 40s</div>
                <div className="text-sm">Average session time</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">24.18</div>
                <div className="text-sm">Events per user</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">90.6%</div>
                <div className="text-sm">Engagement rate</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h4 className="font-medium mb-2">Growth Trajectory</h4>
            <p>On track for <span className="font-bold text-blue-600">70,000-80,000 users</span> by year-end</p>
          </div>
        </div>
        
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-3">Parent Response</h3>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-700 italic">"This is the tool I wish I had when I was looking for childcare for my daughter. I spent weeks researching and still missed critical information that I later discovered about our daycare."</p>
                <p className="text-sm text-gray-500 mt-1">— Dallas parent on r/daddit</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-700 italic">"Just spent an hour on DaycareAlert and found THREE safety violations at the center we were about to tour. This should be mandatory for all parents."</p>
                <p className="text-sm text-gray-500 mt-1">— User feedback email</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-700 italic">"Finally someone made this information easy to find! I've been telling everyone I know with kids about this site."</p>
                <p className="text-sm text-gray-500 mt-1">— r/Dallas comment</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderValueContent = () => {
    return (
      <div className="bg-gray-50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Value Creation for The Button Law Firm</h2>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Alignment of Missions</h3>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="border-r pr-4">
                <h4 className="font-medium mb-2 text-blue-600">DaycareAlert</h4>
                <p className="text-gray-700">Aims to prevent daycare incidents through transparency and information access</p>
                <ul className="mt-2 text-sm text-gray-700 list-disc ml-4 space-y-1">
                  <li>Empowers parents with comprehensive safety data</li>
                  <li>Currently serving 1.7K users with 90.6% engagement rate</li>
                  <li>Platform-wide database of violations and inspection results</li>
                  <li>Real-time alerts on new violations at monitored centers</li>
                </ul>
              </div>
              <div className="pl-4">
                <h4 className="font-medium mb-2 text-green-600">Button Law</h4>
                <p className="text-gray-700">Specializes in seeking justice when prevention fails and harm occurs</p>
                <ul className="mt-2 text-sm text-gray-700 list-disc ml-4 space-y-1">
                  <li>Extensive expertise in daycare injury and negligence cases</li>
                  <li>Deep understanding of Texas childcare regulations</li>
                  <li>Proven track record of client advocacy and results</li>
                  <li>Commitment to improving overall industry standards</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t text-center">
              <p className="font-medium text-purple-700">Combined: A comprehensive approach to child safety in Texas</p>
              <p className="text-sm text-gray-600 mt-1">Prevention + Response + Advocacy = Transformative Safety Ecosystem</p>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Qualified Lead Generation</h3>
          
          <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
            <h4 className="font-medium mb-2">Highly Targeted Audience</h4>
            <ul className="list-disc ml-5 space-y-1 text-gray-700">
              <li>Parents actively researching daycare safety</li>
              <li>Dallas and greater Texas-area concentration</li>
              <li>Precise targeting of parents with safety concerns (highest-intent leads)</li>
            </ul>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
            <h4 className="font-medium mb-2">Demonstrated Intent</h4>
            <p className="text-gray-700 mb-2">Users performing specific safety-related searches and violation lookups</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <h5 className="text-sm font-medium text-gray-700">Top Search Queries:</h5>
                <ul className="text-sm text-gray-600 list-disc ml-4 mt-1">
                  <li>"daycarealert" - 78.68% of searches</li>
                  <li>"daycare alert" - 21.32% of searches</li>
                  <li>"affordable daycare near me with prices"</li>
                  <li>"affordable daycare lake dallas"</li>
                </ul>
              </div>
              <div>
                <h5 className="text-sm font-medium text-gray-700">User Actions:</h5>
                <ul className="text-sm text-gray-600 list-disc ml-4 mt-1">
                  <li>58K+ total events</li>
                  <li>24.18 events per active user</li>
                  <li>15% specifically researching violation history</li>
                  <li>5:40 average session duration</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h4 className="font-medium mb-2">Volume Potential & Growth Trajectory</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="py-2 px-4 text-left">Timeframe</th>
                    <th className="py-2 px-4 text-left">Active Users</th>
                    <th className="py-2 px-4 text-left">Qualified Leads</th>
                    <th className="py-2 px-4 text-left">Case Opportunities</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2 px-4 border-t">Current (Monthly)</td>
                    <td className="py-2 px-4 border-t">1,700+</td>
                    <td className="py-2 px-4 border-t">5-10</td>
                    <td className="py-2 px-4 border-t">1-3</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 border-t">Q4 2025 (Monthly)</td>
                    <td className="py-2 px-4 border-t">15,000+</td>
                    <td className="py-2 px-4 border-t">30-50</td>
                    <td className="py-2 px-4 border-t">8-15</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 border-t">Q4 2026 (Monthly)</td>
                    <td className="py-2 px-4 border-t">50,000+</td>
                    <td className="py-2 px-4 border-t">100-125</td>
                    <td className="py-2 px-4 border-t">25-35</td>
                  </tr>
                  <tr className="bg-blue-50">
                    <td className="py-2 px-4 border-t font-medium">3-Year Projection</td>
                    <td className="py-2 px-4 border-t font-medium">~75,000 active users</td>
                    <td className="py-2 px-4 border-t font-medium">1,200-1,500 total</td>
                    <td className="py-2 px-4 border-t font-medium">300-450 total</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-xs text-gray-500 italic">
              Note: Conservative projections based on Texas focus initially, with phased expansion to other states beginning Q3 2025
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Trust & Authority Enhancement</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h4 className="font-medium mb-2">Context-Appropriate Visibility</h4>
              <p className="text-gray-700 mb-2">Legal resources section integrated within parent safety journey</p>
              <div className="bg-gray-50 p-2 rounded border border-gray-200 text-sm">
                <p className="font-medium text-gray-700">Strategic Placement Points:</p>
                <ul className="text-gray-600 list-disc ml-4 mt-1 space-y-1">
                  <li>After viewing critical/serious safety violations</li>
                  <li>Within "Know Your Rights" section on detail pages</li>
                  <li>As part of safety preparation checklists</li>
                  <li>In notification emails for monitored daycare updates</li>
                </ul>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h4 className="font-medium mb-2">Credibility Transfer</h4>
              <p className="text-gray-700 mb-2">Association with a data-driven transparency platform (1,700+ active users)</p>
              <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm">
                <p className="text-gray-700 mb-2">Key Credibility Metrics:</p>
                <ul className="list-disc ml-4 space-y-1 text-gray-600">
                  <li>90.6% engagement rate demonstrates user trust and platform reliability</li>
                  <li>Average session time of 5m 40s shows deep user investment</li>
                  <li>Reddit virality (200,000+ views) indicates strong community endorsement</li>
                  <li>Featured in multiple parenting forums as trusted safety resource</li>
                  <li>Transparent methodology and data-driven approach aligns with legal standards</li>
                </ul>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h4 className="font-medium mb-2">Thought Leadership Platform</h4>
              <p className="text-gray-700 mb-2">Opportunity to demonstrate expertise on child safety issues</p>
              <div className="flex space-x-2 mt-2">
                <div className="flex-1 bg-blue-50 p-2 rounded text-sm">
                  <p className="font-medium text-blue-700">Expert Content</p>
                  <ul className="text-blue-700 text-xs list-disc ml-3 mt-1">
                    <li>Monthly blog articles</li>
                    <li>Explanatory video series</li>
                    <li>Regulatory update bulletins</li>
                  </ul>
                </div>
                <div className="flex-1 bg-green-50 p-2 rounded text-sm">
                  <p className="font-medium text-green-700">Audience</p>
                  <ul className="text-green-700 text-xs list-disc ml-3 mt-1">
                    <li>1,700+ users & growing</li>
                    <li>DFW area concentration</li>
                    <li>High-intent parent researchers</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h4 className="font-medium mb-2">Media Visibility</h4>
              <p className="text-gray-700 mb-2">Participation in upcoming reporting and public awareness campaigns</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 p-2 rounded text-sm">
                  <p className="font-medium text-gray-700 mb-1">Media Opportunities:</p>
                  <ul className="list-disc ml-4 space-y-1 text-gray-600">
                    <li>Local news features on platform growth</li>
                    <li>Industry podcasts focused on childcare safety</li>
                    <li>Parent advocacy group collaborations</li>
                    <li>Texas-focused parenting publications</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-2 rounded text-sm">
                  <p className="font-medium text-gray-700 mb-1">Campaign Impact:</p>
                  <ul className="list-disc ml-4 space-y-1 text-gray-600">
                    <li>Positioning as go-to legal experts</li>
                    <li>Thought leadership reinforcement</li>
                    <li>Proactive rather than reactive branding</li>
                    <li>Expanded reach beyond traditional channels</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-3">Data Intelligence & Trend Analysis</h3>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-blue-500 font-bold mr-2">•</span>
                <div>
                  <span className="font-medium">Violation Pattern Recognition:</span> Access to anonymized trend data across Texas daycares
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 font-bold mr-2">•</span>
                <div>
                  <span className="font-medium">Geographic Insights:</span> Heatmap data on violation hotspots across Dallas-Fort Worth and Texas
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 font-bold mr-2">•</span>
                <div>
                  <span className="font-medium">Early Warning System:</span> Identification of emerging safety issues before they become widespread
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 font-bold mr-2">•</span>
                <div>
                  <span className="font-medium">Predictive Analytics:</span> Future AI-driven risk assessment model for daycare facilities
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 font-bold mr-2">•</span>
                <div>
                  <span className="font-medium">Custom Reporting:</span> Quarterly trend analysis of safety concerns and violation patterns
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderStructureContent = () => {
    return (
      <div className="bg-gray-50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Proposed Partnership Structure</h2>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Content Collaboration</h3>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h4 className="font-medium mb-2">Legal Resource Center</h4>
            <p className="text-gray-700 mb-3">Button Law-authored guides on:</p>
            <ul className="list-disc ml-5 space-y-1 text-gray-700 mb-4">
              <li>"What Constitutes Daycare Negligence in Texas"</li>
              <li>"Steps to Take If Your Child Is Injured at a Daycare"</li>
              <li>"Understanding Your Rights as a Texas Parent"</li>
            </ul>
            
            <h4 className="font-medium mb-2">Expert Q&A Series</h4>
            <p className="text-gray-700 mb-3">Monthly featured answers to parent questions</p>
            
            <h4 className="font-medium mb-2">Safety Checklists</h4>
            <p className="text-gray-700">Co-branded evaluation tools for parents visiting facilities</p>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Technical & Legal Collaboration</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h4 className="font-medium mb-2">Data Interpretation Guidance</h4>
              <p className="text-gray-700">Help translate legal terminology in violation reports</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h4 className="font-medium mb-2">Risk Assessment Enhancement</h4>
              <p className="text-gray-700">Input on weighted factors in daycare safety scores</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h4 className="font-medium mb-2">Compliance Advisory</h4>
              <p className="text-gray-700">Guidance on proper presentation of violation data</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h4 className="font-medium mb-2">Terms of Service Review</h4>
              <p className="text-gray-700">Legal perspective on platform policies</p>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Cross-Promotion Opportunities</h3>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3">
                <div className="text-3xl mb-2"><span role="img" aria-label="Clipboard">📋</span></div>
                <h4 className="font-medium mb-1">Resource Listing</h4>
                <p className="text-sm text-gray-600">Button Law firm featured in "Legal Resources" section</p>
              </div>
              <div className="text-center p-3">
                <div className="text-3xl mb-2"><span role="img" aria-label="Judge">👨‍</span></div>
                <h4 className="font-medium mb-1">Expert Directory</h4>
                <p className="text-sm text-gray-600">Attorney profiles in expert consultant section</p>
              </div>
              <div className="text-center p-3">
                <div className="text-3xl mb-2"><span role="img" aria-label="Books">📚</span></div>
                <h4 className="font-medium mb-1">Case Study Sharing</h4>
                <p className="text-sm text-gray-600">Anonymized stories highlighting importance of vigilance</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">What DaycareAlert Needs From Button Law</h3>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs mr-2 mt-0.5">1</div>
                <div>
                  <span className="font-medium">Legal Content Expertise:</span> Regular contributions to the Knowledge Base (2-3 articles monthly) on daycare safety and parental rights
                </div>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs mr-2 mt-0.5">2</div>
                <div>
                  <span className="font-medium">Advisory Support:</span> Consultation on legal aspects of the platform, violation interpretation, and compliance considerations
                </div>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs mr-2 mt-0.5">3</div>
                <div>
                  <span className="font-medium">Legal Support:</span> Assistance with terms of service, data usage policies, and protection against potential provider litigation
                </div>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs mr-2 mt-0.5">4</div>
                <div>
                  <span className="font-medium">Credibility Endorsement:</span> Testimonial and permission to list Button Law as an official legal resource partner to enhance platform authority
                </div>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs mr-2 mt-0.5">5</div>
                <div>
                  <span className="font-medium">Media Connections:</span> Introductions to relevant journalists and media outlets to enhance visibility and awareness
                </div>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs mr-2 mt-0.5">6</div>
                <div>
                  <span className="font-medium">Regulatory Insights:</span> Keeping DaycareAlert updated on relevant legislative changes and childcare industry regulations
                </div>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-3">Questions to Explore Together</h3>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <ul className="space-y-2 text-gray-700">
              <li className="p-2 bg-gray-50 rounded">"What patterns have you observed in daycare injury cases that could inform our safety rating system?"</li>
              <li className="p-2 bg-gray-50 rounded">"How could DaycareAlert's data help you identify systemic issues in the childcare industry?"</li>
              <li className="p-2 bg-gray-50 rounded">"What information do you find parents consistently lack when they come to you with cases?"</li>
              <li className="p-2 bg-gray-50 rounded">"How might our violation alert system help prevent situations that typically lead to legal cases?"</li>
              <li className="p-2 bg-gray-50 rounded">"What specific daycare safety metrics would be most valuable for parents from your perspective?"</li>
              <li className="p-2 bg-gray-50 rounded">"How could we structure a seamless referral process that respects parent privacy and needs?"</li>
              <li className="p-2 bg-gray-50 rounded">"What legal considerations should we prioritize as we expand beyond Texas?"</li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderNextStepsContent = () => {
    return (
      <div className="bg-gray-50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Partnership Benefits & Next Steps</h2>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Partnership Benefits Summary</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h4 className="font-medium mb-3 text-blue-600">For Button Law Firm</h4>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">✓</span>
                  <div>
                    <span className="font-medium">Qualified Lead Access:</span> Connection to parents actively concerned about daycare safety
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">✓</span>
                  <div>
                    <span className="font-medium">Brand Positioning:</span> Association with a mission-driven platform gaining viral attention
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">✓</span>
                  <div>
                    <span className="font-medium">Thought Leadership:</span> Platform to demonstrate expertise and commitment to prevention
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">✓</span>
                  <div>
                    <span className="font-medium">Data Insights:</span> Early awareness of emerging patterns in daycare safety concerns
                  </div>
                </li>
              </ul>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h4 className="font-medium mb-3 text-green-600">For DaycareAlert</h4>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <div>
                    <span className="font-medium">Expert Content:</span> Professional legal perspective enhancing platform value
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <div>
                    <span className="font-medium">Technical Guidance:</span> Legal expertise in data presentation and compliance
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <div>
                    <span className="font-medium">Credibility Enhancement:</span> Association with established firm in child safety space
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <div>
                    <span className="font-medium">Resource Expansion:</span> Addition of "what to do if something happens" resources
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Long-Term Vision & Revenue Model</h3>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="border-r pr-3">
                <h4 className="font-medium mb-2">Mutually Reinforcing Growth</h4>
                <ul className="text-sm text-gray-700 space-y-1 list-disc ml-4">
                  <li>DaycareAlert's phased expansion to nationwide coverage</li>
                  <li>Potential for Button Law collaboration to expand alongside platform growth</li>
                  <li>Building the definitive safety-focused ecosystem for childcare in Texas and beyond</li>
                </ul>
              </div>
              <div className="border-r px-3">
                <h4 className="font-medium mb-2">Complementary Services</h4>
                <ul className="text-sm text-gray-700 space-y-1 list-disc ml-4">
                  <li>Button Law's expert guidance informing DaycareAlert's risk assessment methodology</li>
                  <li>DaycareAlert's data strengthening Button Law's industry knowledge</li>
                  <li>Joint development of educational resources for parents and providers</li>
                </ul>
              </div>
              <div className="pl-3">
                <h4 className="font-medium mb-2">Shared Commitment</h4>
                <ul className="text-sm text-gray-700 space-y-1 list-disc ml-4">
                  <li>Combined prevention-and-response approach to childcare safety</li>
                  <li>Establishment as the authoritative voices in Texas daycare safety</li>
                  <li>Potential for meaningful policy impact and regulatory improvements</li>
                </ul>
              </div>
            </div>
            
            <div className="border-t pt-4 mt-2">
              <h4 className="font-medium mb-3">Sustainable Revenue Streams (No Parent Subscription Fees)</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 p-3 rounded">
                  <h5 className="font-medium text-sm text-blue-700 mb-2">Data Licensing</h5>
                  <ul className="text-xs text-gray-600 list-disc ml-3 space-y-1">
                    <li>Insurance companies seeking risk assessment</li>
                    <li>Policy makers requiring detailed compliance data</li>
                    <li>Child welfare organizations needing trend analysis</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <h5 className="font-medium text-sm text-green-700 mb-2">Daycare Referrals</h5>
                  <ul className="text-xs text-gray-600 list-disc ml-3 space-y-1">
                    <li>Commission for successful daycare enrollments</li>
                    <li>Premium provider listings and verification</li>
                    <li>Enhanced profile features for quality centers</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <h5 className="font-medium text-sm text-purple-700 mb-2">Targeted Partnerships</h5>
                  <ul className="text-xs text-gray-600 list-disc ml-3 space-y-1">
                    <li>Legal referrals for safety-concerned parents</li>
                    <li>Approved childcare product vendors</li>
                    <li>Contextual sponsorships from relevant services</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-3">Next Steps Proposal</h3>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="relative">
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-blue-300"></div>
              <ul className="space-y-4">
                <li className="flex pl-8 relative">
                  <div className="absolute left-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">1</div>
                  <div>
                    <h4 className="font-medium">Two-Week Platform Exploration</h4>
                    <p className="text-sm text-gray-600">Button Law team reviews platform and identifies collaboration areas</p>
                  </div>
                </li>
                <li className="flex pl-8 relative">
                  <div className="absolute left-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">2</div>
                  <div>
                    <h4 className="font-medium">Content Development Plan</h4>
                    <p className="text-sm text-gray-600">Develop 3-month roadmap for legal resource contributions</p>
                  </div>
                </li>
                <li className="flex pl-8 relative">
                  <div className="absolute left-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">3</div>
                  <div>
                    <h4 className="font-medium">Legal Resource Integration</h4>
                    <p className="text-sm text-gray-600">Schedule technical session to discuss implementation approach</p>
                  </div>
                </li>
                <li className="flex pl-8 relative">
                  <div className="absolute left-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">4</div>
                  <div>
                    <h4 className="font-medium">90-Day Pilot Partnership</h4>
                    <p className="text-sm text-gray-600">Establish initial collaboration with defined success metrics</p>
                  </div>
                </li>
                <li className="flex pl-8 relative">
                  <div className="absolute left-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">5</div>
                  <div>
                    <h4 className="font-medium">Monthly Strategy Sessions</h4>
                    <p className="text-sm text-gray-600">Regular check-ins to assess partnership effectiveness and expand opportunities</p>
                  </div>
                </li>
                <li className="flex pl-8 relative">
                  <div className="absolute left-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">6</div>
                  <div>
                    <h4 className="font-medium">Joint PR Announcement</h4>
                    <p className="text-sm text-gray-600">Consider formal announcement once initial phase proves successful</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold text-center mb-6 mobile-text-center">DaycareAlert Partnership Presentation</h1>
      
      {/* Tab Navigation - Mobile Friendly with Horizontal Scroll */}
      <div className="tab-navigation">
        <button 
          className={`px-4 py-2 mr-2 rounded-t-lg font-medium tab-button ${activeTab === 'visuals' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('visuals')}
        >
          Visuals & Charts
        </button>
        <button 
          className={`px-4 py-2 mr-2 rounded-t-lg font-medium tab-button ${activeTab === 'agenda' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('agenda')}
        >
          Agenda
        </button>
        <button 
          className={`px-4 py-2 mr-2 rounded-t-lg font-medium tab-button ${activeTab === 'metrics' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('metrics')}
        >
          Growth Metrics
        </button>
        <button 
          className={`px-4 py-2 mr-2 rounded-t-lg font-medium tab-button ${activeTab === 'value' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('value')}
        >
          Value Creation
        </button>
        <button 
          className={`px-4 py-2 mr-2 rounded-t-lg font-medium tab-button ${activeTab === 'structure' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('structure')}
        >
          Partnership Structure
        </button>
        <button 
          className={`px-4 py-2 mr-2 rounded-t-lg font-medium tab-button ${activeTab === 'nextSteps' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('nextSteps')}
        >
          Benefits & Next Steps
        </button>
      </div>
      
      {/* Tab Content */}
      <div className="responsive-chart-container">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default EnhancedButtonPresentation;
