// src/api/reports.ts
export const fetchReports = async (): Promise<Report[]> => {
  // Simulating an API call
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve([
        { id: 1, title: "تقرير مبيعات أبريل", description: "تفاصيل مبيعات شهر أبريل", date: "2025-04-30" },
        { id: 2, title: "تقرير مبيعات مايو", description: "تفاصيل مبيعات شهر مايو", date: "2025-05-30" },
      ]);
    }, 2000)
  );
};
