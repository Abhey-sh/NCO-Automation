import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
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
import { generateRecurringBookings } from "../../services/import-service";
import { useAppStore } from "../../store/app-store";
import type {
  RecurringBookingsRow,
  RecurringBookingsSkipSummary,
} from "../../types/imports";

const recurringBookingsColumns: CsvColumn<RecurringBookingsRow>[] = [
  { key: "userForeignId", header: "userForeignId" },
  { key: "studioForeignId", header: "studioForeignId" },
  { key: "studioId", header: "studioId" },
  { key: "programId", header: "programId" },
  { key: "bookStartTime", header: "bookStartTime" },
  { key: "bookUntilTime", header: "bookUntilTime" },
  { key: "scheduleCode", header: "scheduleCode" },
];

function getSkipMessage(skip: RecurringBookingsSkipSummary) {
  const recordLabel = skip.count === 1 ? "record" : "records";

  switch (skip.reason) {
    case "Missing Program ID or Schedule Code":
      return `${skip.count} ${recordLabel} skipped because Program ID or Schedule Code was missing.`;
    case "User not found in Class Booking":
      return `${skip.count} ${recordLabel} skipped because no matching Class Booking record was found.`;
    case "User not found in UUID":
      return `${skip.count} ${recordLabel} skipped because no matching UUID record was found.`;
    default:
      return `${skip.count} ${recordLabel} could not be generated.`;
  }
}

export function RecurringBookingsCard() {
  const configuration = useAppStore((state) => state.configurationState);
  const reviewedMappings = useAppStore((state) => state.reviewedMappings);
  const uuidLookup = useAppStore((state) => state.uuidLookup);
  const classBookingLookup = useAppStore((state) => state.classBookingLookup);
  const rows = useAppStore((state) => state.recurringBookingsRows);
  const setRows = useAppStore((state) => state.setRecurringBookingsRows);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [skips, setSkips] = useState<RecurringBookingsSkipSummary[]>([]);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const handleGenerate = async () => {
    setSkips([]);
    setToastMessage("");
    setError("");

    if (
      !configuration.studioId.trim() ||
      !configuration.bookStartDateTime ||
      !configuration.bookUntilDateTime
    ) {
      setError("Studio ID, Book Start Date, and Book Until Date are required.");
      return;
    }

    const matchedMappings = reviewedMappings.filter((mapping) =>
      ["exact", "manual"].includes(mapping.matchType),
    );
    if (matchedMappings.length === 0) {
      setError("Review Mapping must include at least one Exact or Manual Match.");
      return;
    }
    if (uuidLookup.length === 0) {
      setError("UUID file is required.");
      return;
    }
    if (classBookingLookup.length === 0) {
      setError("Class Booking file is required.");
      return;
    }

    setIsGenerating(true);

    try {
      const result = await generateRecurringBookings({
        studioId: configuration.studioId.trim(),
        bookStartDate: configuration.bookStartDateTime,
        bookUntilDate: configuration.bookUntilDateTime,
        reviewMappings: reviewedMappings,
        uuidLookup,
        classBookingLookup,
      });
      if (result.rows.length === 0) {
        setRows([]);
        setSkips(result.skips);
        setError(
          "No recurring bookings were generated.",
        );
        return;
      }

      setRows(result.rows);
      setSkips(result.skips);
      setShowPreview(false);
      setToastMessage(
        `Recurring Bookings generated: ${result.generatedCount} rows, ${result.skippedCount} skipped.`,
      );
    } catch (generationError) {
      setRows([]);
      setSkips([]);
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
      setError("No generated recurring bookings available.");
      return;
    }
    downloadCsv(
      "recurring_bookings.csv",
      createCsv(rows, recurringBookingsColumns),
    );
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
                  Recurring Bookings Import
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Generate Recurring Bookings Import from the completed Review Mapping.
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

          {skips.length > 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
              <p className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                Some records could not be generated
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {skips.map((skip) => (
                  <li key={skip.reason}>{getSkipMessage(skip)}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {rows.length > 0 ? (
                  <>
                    <Rows3 className="h-4 w-4 text-emerald-500" />
                    Generated &bull; {rows.length} rows
                    {rows.length > 50 ? (
                      <span className="font-normal text-slate-500">
                        (showing first 50)
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-slate-400">
                    Generate Recurring Bookings to enable preview and download.
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

            {rows.length > 0 && showPreview ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ImportPreviewTable
                  rows={rows}
                  columns={recurringBookingsColumns}
                />
              </motion.div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
