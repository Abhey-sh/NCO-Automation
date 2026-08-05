import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Files, ShieldCheck } from "lucide-react";

import { AccountMetadataCard } from "../imports/account-metadata-card";
import { MembershipCancellationCard } from "../imports/membership-cancellation-card";
import { MembershipCard } from "../imports/membership-card";
import { RecurringBookingsCard } from "../imports/recurring-bookings-card";
import { Button } from "../ui/button";
import { useAppStore } from "../../store/app-store";

export function GenerateOutputsStep() {
  const setCurrentStep = useAppStore((state) => state.setCurrentStep);
  const [eaAgreementsConfirmed, setEaAgreementsConfirmed] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="space-y-6"
    >
      <div className="rounded-[32px] border border-slate-200/70 bg-white/80 p-7 shadow-[0_25px_80px_-30px_rgba(15,23,42,0.25)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/70">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-blue-600">
              Step 4
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
              Generate Outputs
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              Generate, preview, and download migration import files.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            <Files className="h-4 w-4 text-blue-600" />
            Import generators
          </div>
        </div>
      </div>

      <AccountMetadataCard />
      <label className="flex cursor-pointer items-start gap-4 rounded-[28px] border border-amber-200 bg-amber-50/80 p-6 shadow-sm transition hover:border-amber-300 dark:border-amber-900/70 dark:bg-amber-950/20 dark:hover:border-amber-800">
        <input
          type="checkbox"
          checked={eaAgreementsConfirmed}
          onChange={(event) => setEaAgreementsConfirmed(event.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 cursor-pointer rounded border-amber-300 text-blue-600 focus:ring-blue-500"
        />
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <span>
          <span className="block font-semibold text-slate-900 dark:text-white">
            Is EA agreements are disabled?
          </span>
          <span className="mt-1 block text-sm leading-6 text-slate-600 dark:text-slate-300">
            Membership Cancellation, Membership, and Recurring Bookings cannot
            be generated until this check is completed.
          </span>
        </span>
      </label>
      <MembershipCancellationCard
        eaAgreementsConfirmed={eaAgreementsConfirmed}
      />
      <MembershipCard eaAgreementsConfirmed={eaAgreementsConfirmed} />
      <RecurringBookingsCard eaAgreementsConfirmed={eaAgreementsConfirmed} />

      <div>
        <Button
          variant="secondary"
          onClick={() => setCurrentStep(3)}
          className="px-6 py-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>
    </motion.div>
  );
}
