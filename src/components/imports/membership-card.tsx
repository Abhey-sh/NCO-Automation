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
import { generateMemberships } from "../../services/import-service";
import { useAppStore } from "../../store/app-store";
import type { MembershipRow, MembershipSkip } from "../../types/imports";

const membershipColumns: CsvColumn<MembershipRow>[] = [
  { key: "userForeignId", header: "userForeignId" },
  { key: "studioForeignId", header: "studioForeignId" },
  { key: "studioId", header: "studioId" },
  { key: "email", header: "email" },
  { key: "status", header: "status" },
  { key: "userMembershipForeignId", header: "userMembershipForeignId" },
  { key: "membershipPlanForeignId", header: "membershipPlanForeignId" },
  { key: "membershipName", header: "membershipName" },
  { key: "planName", header: "planName" },
  { key: "membershipId", header: "membershipId" },
  { key: "planCode", header: "planCode" },
  { key: "price", header: "price" },
  { key: "paymentMethod", header: "paymentMethod" },
  { key: "localPurchaseDate", header: "localPurchaseDate" },
  { key: "localCommencedDate", header: "localCommencedDate" },
  { key: "localCycleStartDate", header: "localCycleStartDate" },
  { key: "localNextPaymentDate", header: "localNextPaymentDate" },
  { key: "order", header: "order" },
  { key: "localCycleExpiryDate", header: "localCycleExpiryDate" },
  { key: "localContractEndDate", header: "localContractEndDate" },
  { key: "autoRenewal", header: "autoRenewal" },
  { key: "localPausedFromDate", header: "localPausedFromDate" },
  { key: "localPausedUntilDate", header: "localPausedUntilDate" },
  { key: "localLockStartDate", header: "localLockStartDate" },
  { key: "overdueAmount", header: "overdueAmount" },
  { key: "isRetrying", header: "isRetrying" },
];

export function MembershipCard() {
  const configuration = useAppStore((state) => state.configurationState);
  const reviewedMappings = useAppStore((state) => state.reviewedMappings);
  const membershipPlanLookup = useAppStore(
    (state) => state.membershipPlanLookup,
  );
  const studentRecords = useAppStore((state) => state.studentRecords);
  const rows = useAppStore((state) => state.membershipRows);
  const setRows = useAppStore((state) => state.setMembershipRows);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [skips, setSkips] = useState<MembershipSkip[]>([]);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const handleGenerate = async () => {
    if (
      !configuration.studioId.trim() ||
      !configuration.cycleStartDate ||
      !configuration.nextPaymentDate
    ) {
      setError("Studio ID, Cycle Start Date, and Next Payment Date are required.");
      return;
    }
    if (reviewedMappings.length === 0) {
      setError("No matched students available.");
      return;
    }
    if (membershipPlanLookup.length === 0) {
      setError("Membership + Plan Name file is required.");
      return;
    }

    setError("");
    setIsGenerating(true);

    try {
      const result = await generateMemberships({
        studioId: configuration.studioId.trim(),
        cycleStartDate: configuration.cycleStartDate,
        nextPaymentDate: configuration.nextPaymentDate,
        deferralDateHeader:
          configuration.deferralDateHeader || "Deferral Date",
        membershipPriceHeader:
          configuration.membershipPriceHeader ||
          "Membership price with discount",
        reviewMappings: reviewedMappings,
        membershipPlanLookup,
        kpiRecords: studentRecords.map(({ studentName, values }) => ({
          studentName,
          values: values ?? {},
        })),
      });
      setRows(result.rows);
      setSkips(result.skips);
      setShowPreview(false);
      setToastMessage(
        `Membership generated: ${result.generatedCount} rows, ${result.skippedCount} skipped.`,
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
      setError("No generated memberships available.");
      return;
    }
    downloadCsv("membership.csv", createCsv(rows, membershipColumns));
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
                  Membership
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Generate Membership Import from the completed Review Mapping.
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
              <p className="font-semibold">{skips.length} students skipped</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {skips.map((skip, index) => (
                  <li key={`${skip.email}-${index}`}>
                    {skip.email || skip.studentName}: {skip.reason}
                  </li>
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
                    Generated • {rows.length} rows
                    {rows.length > 50 ? (
                      <span className="font-normal text-slate-500">
                        (showing first 50)
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-slate-400">
                    Generate Membership to enable preview and download.
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
                <ImportPreviewTable rows={rows} columns={membershipColumns} />
              </motion.div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
