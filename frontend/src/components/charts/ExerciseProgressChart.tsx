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
import type { ExerciseSessionHistory, SetAnalytics } from "@/types";

interface ExerciseProgressChartProps {
  /** Array of exercise history data points */
  data: ExerciseSessionHistory[];
  /** Name of the exercise for display */
  exerciseName?: string;
  /** Optional title for the chart card */
  title?: string;
  /** Optional height in pixels (default: 300) */
  height?: number;
  /** Whether to show the card wrapper (default: true) */
  showCard?: boolean;
}

interface ChartDataPoint {
  date: string;
  totalScore: number;
  sets: SetAnalytics[];
  sessionId: number;
}

/**
 * Line chart displaying exercise performance (Epley score) over time.
 * Shows the cumulative score for the exercise in each session.
 */
export function ExerciseProgressChart({
  data,
  exerciseName,
  title,
  height = 300,
  showCard = true,
}: ExerciseProgressChartProps) {
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
    payload?: Array<{ value: number; payload: ChartDataPoint }>;
  }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3 max-w-xs">
          <p className="text-sm font-medium mb-1">
            {new Date(dataPoint.date).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <p className="text-sm font-bold text-primary mb-2">
            Total Score: {formatScore(dataPoint.totalScore)}
          </p>
          {dataPoint.sets.length > 0 && (
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p className="font-medium">Sets:</p>
              {dataPoint.sets.map((set, i) => (
                <p key={i}>
                  Set {set.set_number}: {set.weight}kg × {set.reps} reps (
                  {set.epley_score.toFixed(1)})
                </p>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Display title
  const chartTitle = title || (exerciseName ? `${exerciseName} Progress` : "Exercise Progress");

  // No data state
  if (!data || data.length === 0) {
    const EmptyState = (
      <div className="flex items-center justify-center h-full text-muted-foreground text-center px-4">
        <p>No history available for this exercise yet. Start logging sets to track your progress!</p>
      </div>
    );

    if (showCard) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{chartTitle}</CardTitle>
          </CardHeader>
          <CardContent style={{ height }}>{EmptyState}</CardContent>
        </Card>
      );
    }
    return <div style={{ height }}>{EmptyState}</div>;
  }

  // Transform and sort data for chart (oldest first)
  const chartData: ChartDataPoint[] = data
    .map((item) => ({
      date: item.date,
      totalScore: item.total_score,
      sets: item.sets,
      sessionId: item.session_id,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const ChartContent = (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={chartData}
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
      >
        <defs>
          <linearGradient id="exerciseProgressGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
          dataKey="totalScore"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#exerciseProgressGradient)"
          dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, fill: "#059669", strokeWidth: 0 }}
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  if (showCard) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{chartTitle}</CardTitle>
        </CardHeader>
        <CardContent>{ChartContent}</CardContent>
      </Card>
    );
  }

  return ChartContent;
}
