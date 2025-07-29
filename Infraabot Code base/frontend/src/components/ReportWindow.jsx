import React, { useMemo } from "react";

function ReportWindow({ layout }) {
  // Generate a simple text report from the layout
  const reportText = useMemo(() => {
    if (!layout || layout.length === 0) {
      return "No layout data available. Send a prompt to generate a layout!";
    }
    return layout.map((room, idx) => (
      `Room ${idx + 1}: ${room.name}\n` +
      `Points: ${JSON.stringify(room.points)}\n`
    )).join("\n");
  }, [layout]);

  return (
    <div className="p-6 h-full overflow-auto font-mono bg-white">
      <h3 className="text-xl font-bold mb-4">Professional Report</h3>
      <pre className="whitespace-pre-wrap">{reportText}</pre>
    </div>
  );
}

export default ReportWindow;
