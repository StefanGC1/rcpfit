import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SessionScoreDataPoint {
  date: string;
  score: number;
  label?: string;
}

interface SessionScoreChartProps {
  /** Array of data points with date and score */
  data: SessionScoreDataPoint[];
  /** Optional title for the chart card */
  title?: string;
  /** Optional height in pixels (default: 300) */
  height?: number;
  /** Whether to show the card wrapper (default: true) */
  showCard?: boolean;
}

/**
 * Line chart displaying session scores over time.
 * Uses Recharts for responsive, interactive visualization.
 */
export function SessionScoreChart({
  data,
  title = "Session Score Over Time",
  height = 300,
  showCard = true,
}: SessionScoreChartProps) {
  // Format date for display on X-axis
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Format score for tooltip
  const formatScore = (score: number) => {
    return score.toFixed(1);
  };

  // Custom tooltip component
  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ value: number; payload: SessionScoreDataPoint }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium">
            {new Date(data.date).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          {data.label && (
            <p className="text-xs text-muted-foreground">{data.label}</p>
          )}
          <p className="text-sm font-bold text-primary">
            Score: {formatScore(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  // No data state
  if (!data || data.length === 0) {
    const EmptyState = (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>No data available yet. Complete some workouts to see your progress!</p>
      </div>
    );

    if (showCard) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{title}</CardTitle>
          </CardHeader>
          <CardContent style={{ height }}>{EmptyState}</CardContent>
        </Card>
      );
    }
    return <div style={{ height }}>{EmptyState}</div>;
  }

  // Sort data by date (oldest first for proper chart display)
  const sortedData = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const ChartContent = (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={sortedData}
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
      >
        <defs>
          <linearGradient id="sessionScoreGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(value) => value.toFixed(0)}
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
          tickLine={false}
          axisLine={false}
          width={50}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="score"
          stroke="#2563eb"
          strokeWidth={2}
          fill="url(#sessionScoreGradient)"
          dot={{ fill: "#2563eb", strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, fill: "#1d4ed8", strokeWidth: 0 }}
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  if (showCard) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>{ChartContent}</CardContent>
      </Card>
    );
  }

  return ChartContent;
}
