import React, { useState } from "react";
import LayoutCanvas from "./LayoutCanvas";
import ReportWindow from "./ReportWindow";

function LayoutSection({ layout, plotDimensions }) {
  const [activeTab, setActiveTab] = useState("preview");

  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar */}
      <div className="flex border-b">
        <button
          className={`px-4 py-2 ${activeTab === "preview" ? "border-b-2 border-blue-600 font-bold" : ""}`}
          onClick={() => setActiveTab("preview")}
        >
          Layout Preview
        </button>
        <button
          className={`px-4 py-2 ${activeTab === "report" ? "border-b-2 border-blue-600 font-bold" : ""}`}
          onClick={() => setActiveTab("report")}
        >
          Professional Report
        </button>
      </div>
      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "preview" ? (
          <LayoutCanvas layout={layout} plotDimensions={plotDimensions} />
        ) : (
          <ReportWindow layout={layout} />
        )}
      </div>
    </div>
  );
}

export default LayoutSection;
