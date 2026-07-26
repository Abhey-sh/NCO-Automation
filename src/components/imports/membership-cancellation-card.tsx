import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  Play,
  Rows3,
} from "lucide-react";

import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Toast } from "../ui/toast";
import { ImportPreviewTable } from "./import-preview-table";
import { createCsv, downloadCsv, type CsvColumn } from "../../lib/csv";
import { generateMembershipCancellation } from "../../services/import-service";
import { useAppStore } from "../../store/app-store";
import type { MembershipCancellationRow } from "../../types/imports";

const membershipCancellationColumns: CsvColumn<MembershipCancellationRow>[] = [
  { key: "email", header: "email" },
  { key: "userId", header: "userId" },
];

export function MembershipCancellationCard() {
  const reviewedMappings = useAppStore((state) => state.reviewedMappings);
  const membershipLookup = useAppStore((state) => state.membershipPlanLookup);
  const rows = useAppStore((state) => state.membershipCancellationRows);
  const setRows = useAppStore((state) => state.setMembershipCancellationRows);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const handleGenerate = async () => {
    if (membershipLookup.length === 0) {
      setError(
        "Membership + Plan Name lookup file is required before generating Membership Cancellation.",
      );
      return;
    }

    if (reviewedMappings.length === 0) {
      setError("No matched students available.");
      return;
    }

    setError("");
    setIsGenerating(true);

    try {
      const generatedRows = await generateMembershipCancellation({
  reviewMappings: reviewedMappings,
  membershipLookup,
});
      setRows(generatedRows);
      setShowPreview(false);
      setToastMessage(
        `Membership Cancellation generated successfully: ${generatedRows.length} rows.`,
      );
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Import generation failed.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (rows.length === 0) {
      setError("No matched students available.");
      return;
    }

    const csv = createCsv(rows, membershipCancellationColumns);
    downloadCsv("membership_cancellation.csv", csv);
  };

  return (
    <>
      <Toast message={toastMessage} />
      <Card className="overflow-hidden rounded-[28px] border-slate-200/70 dark:border-slate-800/80">
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 to-cyan-500" />
        <CardContent className="space-y-6 pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-blue-600 dark:border-slate-700 dark:bg-slate-800">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Membership Cancellation
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Generate Membership Cancellation from the completed Review
                  Mapping results.
                </p>
              </div>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="shrink-0"
            >
              {isGenerating ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isGenerating ? "Generating..." : "Generate"}
            </Button>
          </div>

          {error ? (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300"
            >
              {error}
            </motion.div>
          ) : null}

          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {rows.length > 0 ? (
                  <>
                    <Rows3 className="h-4 w-4 text-emerald-500" />
                    Generated • {rows.length} rows
                    {rows.length > 50 && (
                      <span className="font-normal text-slate-500">
                        (showing first 50)
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-slate-400">
                    Generate Membership Cancellation to enable preview and
                    download.
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={rows.length === 0}
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      Hide Preview
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Preview
                    </>
                  )}
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  disabled={rows.length === 0}
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4" />
                  Download CSV
                </Button>
              </div>
            </div>

            {rows.length > 0 && showPreview && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ImportPreviewTable
                  rows={rows}
                  columns={membershipCancellationColumns}
                />
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
