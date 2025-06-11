import { useAnalytics } from '../context/AnalyticsContext';
import { useFeatureFlag } from '../../../utils/features';

export default function AnalyticsPage() {
  const { metrics, timeRange, setTimeRange } = useAnalytics();
  const hasAdvanced = useFeatureFlag('advanced-analytics');

  return (
    <div>
      <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      {hasAdvanced ? (
        <AdvancedCharts data={metrics} />
      ) : (
        <BasicMetrics data={metrics} />
      )}
    </div>
  );
}