import React, { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const ChartSection = lazy(() => import('../components/ChartSection'));
const TableSection = lazy(() => import('../components/TableSection'));

const ErrorFallback = () => (
  <div className="p-4 text-red-600 bg-red-100 rounded">
    حدث خطأ أثناء تحميل التقرير. الرجاء المحاولة مرة أخرى لاحقًا.
  </div>
);

class ReportErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return <ErrorFallback />;
    return this.props.children;
  }
}

const InventoryReportPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>تقرير الجرد - لوحة التحكم</title>
        <meta
          name="description"
          content="صفحة تقرير الجرد التفصيلي لمخزون العطور والزجاجات."
        />
      </Helmet>

      <div className="h-full overflow-y-auto scroll-smooth p-4 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-purple-800 dark:text-white">
            تقرير الجرد
          </h2>
          <button
            onClick={() => navigate(-1)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded shadow"
          >
            ⬅ رجوع
          </button>
        </div>

        <ReportErrorBoundary>
          <Suspense
            fallback={
              <div className="text-center text-gray-500">
                جاري تحميل الرسوم البيانية...
              </div>
            }
          >
            <ChartSection />
          </Suspense>

          <Suspense
            fallback={
              <div className="text-center text-gray-500">
                جاري تحميل جدول البيانات...
              </div>
            }
          >
            <TableSection />
          </Suspense>
        </ReportErrorBoundary>
      </div>
    </>
  );
};

export default InventoryReportPage;
