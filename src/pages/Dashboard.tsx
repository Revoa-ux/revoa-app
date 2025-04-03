import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, 
  Users, 
  DollarSign,
  RefreshCw,
  Clock,
  Package,
  TrendingUp,
  Wallet,
  Calendar,
  LayoutGrid,
  LineChart,
  ShoppingCart,
  CreditCard,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AdReportsTimeSelector, { TimeOption } from '../components/reports/AdReportsTimeSelector';

type CardType = 
  | 'profit' 
  | 'revenue' 
  | 'orders' 
  | 'aov' 
  | 'cogs'
  | 'adCosts'
  | 'transactionFees'
  | 'fulfill' 
  | 'balance' 
  | 'projected';

type ViewType = 'card' | 'chart';

interface CardData {
  id: CardType;
  title: string;
  icon: React.ReactNode;
  mainValue: string | number;
  change: string;
  changeType: 'positive' | 'negative' | 'critical';
  dataPoint1: { label: string; value: string | number };
  dataPoint2: { label: string; value: string | number };
  chartData: Array<{ date: string; value1: number; value2: number; value3: number }>;
  showInChartView?: boolean;
}

export default function Dashboard() {
  const [timeframe, setTimeframe] = useState<'1d' | '7d' | '30d' | 'custom'>('7d');
  const [selectedTime, setSelectedTime] = useState<TimeOption>('7d');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: new Date()
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardType>('profit');
  const [viewType, setViewType] = useState<ViewType>('card');
  
  const userFirstName = "John";

  const handleTimeChange = useCallback((time: TimeOption) => {
    setSelectedTime(time);
    
    switch (time) {
      case '24h':
        setTimeframe('1d');
        break;
      case '7d':
      case '14d':
        setTimeframe('7d');
        break;
      case '30d':
      case '60d':
      case '90d':
        setTimeframe('30d');
        break;
      case 'custom':
        setTimeframe('custom');
        break;
      default:
        setTimeframe('7d');
    }
  }, []);

  const handleDateRangeChange = (range: { startDate: Date; endDate: Date }) => {
    setDateRange(range);
  };

  const cardsData: CardData[] = [
    {
      id: 'profit',
      title: 'Profit',
      icon: <TrendingUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />,
      mainValue: '$5,960',
      change: '34.1%',
      changeType: 'positive',
      dataPoint1: { label: 'Profit Margin', value: '26.6%' },
      dataPoint2: { label: 'Expenses', value: '$18,727' },
      chartData: [
        { date: '2024-03-01', value1: 4200, value2: 24.2, value3: 14200 },
        { date: '2024-03-02', value1: 4500, value2: 24.8, value3: 15100 },
        { date: '2024-03-03', value1: 4800, value2: 25.1, value3: 15900 },
        { date: '2024-03-04', value1: 5200, value2: 25.5, value3: 16800 },
        { date: '2024-03-05', value1: 5500, value2: 26.0, value3: 17500 },
        { date: '2024-03-06', value1: 5800, value2: 26.4, value3: 18200 },
        { date: '2024-03-07', value1: 5960, value2: 26.6, value3: 18727 }
      ],
      showInChartView: true
    },
    // ... other card data
  ];

  const chartViewCards = cardsData.filter(card => card.showInChartView !== false);
  const selectedCardData = cardsData.find(c => c.id === selectedCard);

  const handleApplyDateRange = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  useEffect(() => {
    handleApplyDateRange();
  }, [timeframe, selectedTime]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
  };

  const dataPointLabels = {
    value1: selectedCard ? cardsData.find(c => c.id === selectedCard)?.title : '',
    value2: selectedCard ? cardsData.find(c => c.id === selectedCard)?.dataPoint1.label : '',
    value3: selectedCard ? cardsData.find(c => c.id === selectedCard)?.dataPoint2.label : ''
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md">
          <p className="text-base font-medium text-gray-900 dark:text-white mb-2">{formatDate(label)}</p>
          <div className="space-y-1">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-white">{dataPointLabels.value1}:</span>{' '}
              {payload[0].value}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-white">{dataPointLabels.value2}:</span>{' '}
              {payload[1].value}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-white">{dataPointLabels.value3}:</span>{' '}
              {payload[2].value}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderChangeIndicator = (change: string, changeType: 'positive' | 'negative' | 'critical') => {
    if (changeType === 'critical') {
      return (
        <div className="flex items-center text-red-500 dark:text-red-400 font-medium">
          <AlertTriangle className="w-4 h-4 mr-1" />
          {change}
        </div>
      );
    }
    
    const Icon = changeType === 'positive' ? ArrowUpRight : ArrowDownRight;
    return (
      <div className={`flex items-center text-sm ${
        changeType === 'positive' ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'
      }`}>
        <Icon className="w-4 h-4 mr-1" />
        {change}
      </div>
    );
  };

  return (
    <div className="max-w-[1050px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
          Hi {userFirstName}, welcome to Revoa👋
        </h1>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isLoading ? 'Updating dashboard...' : 'Last updated: ' + new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button 
            className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
            onClick={handleApplyDateRange}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Refreshing...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </>
            )}
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewType('card')}
              className={`relative flex items-center px-3 py-1.5 rounded-lg text-sm transition-colors ${
                viewType === 'card' 
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm -my-[1px] py-[7px] -mx-[1px] px-[13px]' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4 mr-1.5" />
              Card View
            </button>
            <button
              onClick={() => setViewType('chart')}
              className={`relative flex items-center px-3 py-1.5 rounded-lg text-sm transition-colors ${
                viewType === 'chart' 
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm -my-[1px] py-[7px] -mx-[1px] px-[13px]' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <LineChart className="w-4 h-4 mr-1.5" />
              Chart View
            </button>
          </div>
          <AdReportsTimeSelector
            selectedTime={selectedTime}
            onTimeChange={handleTimeChange}
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            onApply={handleApplyDateRange}
          />
        </div>
      </div>

      {viewType === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cardsData.map((card) => (
            <div 
              key={card.id}
              onClick={() => setSelectedCard(card.id)}
              className="h-[180px] p-4 rounded-xl cursor-pointer transition-colors bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 flex flex-col"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                  {card.icon}
                </div>
                {renderChangeIndicator(card.change, card.changeType)}
              </div>
              <div className="flex-1 flex flex-col">
                <div>
                  <h3 className="text-xs text-gray-500 dark:text-gray-400">{card.title}</h3>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
                    {card.mainValue}
                  </p>
                </div>
                <div className="mt-auto space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{card.dataPoint1.label}</span>
                    <span className="text-xs font-medium text-gray-900 dark:text-white">{card.dataPoint1.value}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{card.dataPoint2.label}</span>
                    <span className="text-xs font-medium text-gray-900 dark:text-white">{card.dataPoint2.value}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-6 gap-2 p-4">
              {chartViewCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => setSelectedCard(card.id)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    selectedCard === card.id
                      ? 'bg-gray-900 dark:bg-gray-700 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <span className="mr-1.5">{card.icon}</span>
                    <span className="truncate">{card.title}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            {selectedCard && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {cardsData.find(c => c.id === selectedCard)?.title}
                    </h3>
                    {renderChangeIndicator(
                      cardsData.find(c => c.id === selectedCard)?.change || '',
                      cardsData.find(c => c.id === selectedCard)?.changeType || 'positive'
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-[#F43F5E] mr-2"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{dataPointLabels.value1}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-[#E8795A] mr-2"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{dataPointLabels.value2}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-[#EC4899] mr-2"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{dataPointLabels.value3}</span>
                    </div>
                  </div>
                </div>

                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={cardsData.find(c => c.id === selectedCard)?.chartData}
                      margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                      <XAxis 
                        dataKey="date"
                        tickFormatter={formatDate}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                        tickFormatter={(value) => {
                          if (value >= 1000) {
                            return `${(value / 1000).toFixed(0)}k`;
                          }
                          return value.toString();
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="value1"
                        name={dataPointLabels.value1}
                        stroke="#F43F5E"
                        fill="#F43F5E"
                        fillOpacity={0.1}
                      />
                      <Area
                        type="monotone"
                        dataKey="value2"
                        name={dataPointLabels.value2}
                        stroke="#E8795A"
                        fill="#E8795A"
                        fillOpacity={0.1}
                      />
                      <Area
                        type="monotone"
                        dataKey="value3"
                        name={dataPointLabels.value3}
                        stroke="#EC4899"
                        fill="#EC4899"
                        fillOpacity={0.1}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}