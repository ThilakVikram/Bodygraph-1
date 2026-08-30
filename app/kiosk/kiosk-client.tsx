"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, Dumbbell, LogOut as LogOutIcon, XCircle } from "lucide-react";
import { kioskConfirmCheckOutAction, kioskLookupAction } from "@/lib/actions/attendance";
import { initialActionState } from "@/lib/actions/types";
import { APP_NAME, MEMBERSHIP_EXPIRY_WINDOW_DAYS } from "@/lib/constants";
import { cn, formatDate, formatTime } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const RESET_DELAY_MS = 8000;

type IdentifyMode = "MEMBER_ID" | "PHONE";

type MembershipInfo = {
  membershipStatus: string | null;
  membershipPlanName: string | null;
  membershipEndDate: string | null;
  daysLeft: number | null;
};

type KioskResult = MembershipInfo & {
  action: "IN" | "OUT";
  memberName: string;
  memberCode: string;
  photoUrl: string | null;
};

type PendingCheckout = MembershipInfo & {
  attendanceId: string;
  checkInAt: string;
  memberName: string;
  memberCode: string;
  photoUrl: string | null;
};

function membershipAlert(info: MembershipInfo) {
  const isExpired =
    info.membershipStatus === "EXPIRED" || (info.daysLeft !== null && info.daysLeft < 0);
  const isExpiringSoon =
    !isExpired &&
    info.membershipStatus === "ACTIVE" &&
    info.daysLeft !== null &&
    info.daysLeft <= MEMBERSHIP_EXPIRY_WINDOW_DAYS;
  return { isExpired, isExpiringSoon };
}

function MembershipCard({ info }: { info: MembershipInfo }) {
  if (!info.membershipPlanName) {
    return <p className="text-sm text-muted-foreground">No membership on file.</p>;
  }
  const { isExpired, isExpiringSoon } = membershipAlert(info);
  return (
    <div
      className={cn(
        "rounded-xl border p-4 text-left text-sm",
        isExpired
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : isExpiringSoon
            ? "border-warning/30 bg-warning-bg text-warning"
            : "border-border bg-muted/40 text-foreground",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium">{info.membershipPlanName}</span>
        <span>{info.membershipEndDate ? formatDate(info.membershipEndDate) : "—"}</span>
      </div>
      <p className="mt-1 flex items-center gap-1.5">
        <Clock className="h-4 w-4 shrink-0" />
        {isExpired
          ? `Membership expired ${Math.abs(info.daysLeft ?? 0)} day(s) ago — please renew at the front desk.`
          : isExpiringSoon
            ? `Membership expires in ${info.daysLeft} day(s) — renew soon!`
            : `${info.daysLeft ?? "—"} day(s) remaining.`}
      </p>
    </div>
  );
}

export function KioskClient() {
  const [mode, setMode] = useState<IdentifyMode>("MEMBER_ID");
  const [identifier, setIdentifier] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<KioskResult | null>(null);
  const [pendingCheckout, setPendingCheckout] = useState<PendingCheckout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setResult(null);
    setPendingCheckout(null);
    setError(null);
    setIdentifier("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!identifier.trim() || pending) return;
    setPending(true);
    const formData = new FormData();
    formData.set("identifier", identifier);
    try {
      const res = await kioskLookupAction(initialActionState, formData);
      if (res.success && res.data) {
        if (res.data.needsCheckoutConfirm) {
          setPendingCheckout(res.data as unknown as PendingCheckout);
        } else {
          setResult(res.data as unknown as KioskResult);
        }
        setError(null);
      } else {
        setError(res.error ?? "Something went wrong. Try again.");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setPending(false);
      setIdentifier("");
    }
  }

  async function confirmCheckOut() {
    if (!pendingCheckout || pending) return;
    setPending(true);
    const formData = new FormData();
    formData.set("attendanceId", pendingCheckout.attendanceId);
    try {
      const res = await kioskConfirmCheckOutAction(initialActionState, formData);
      if (res.success && res.data) {
        setResult(res.data as unknown as KioskResult);
        setPendingCheckout(null);
        setError(null);
      } else {
        setError(res.error ?? "Something went wrong. Try again.");
        setPendingCheckout(null);
      }
    } catch {
      setError("Something went wrong. Try again.");
      setPendingCheckout(null);
    } finally {
      setPending(false);
    }
  }

  const showingScreen = Boolean(result || error || pendingCheckout);

  // Auto-return to the entry screen so no one member's details linger for
  // the next person (and a forgotten confirm doesn't stall the kiosk), and
  // refocus the input while it's showing.
  useEffect(() => {
    if (!showingScreen) {
      inputRef.current?.focus();
      return;
    }
    const timer = setTimeout(reset, RESET_DELAY_MS);
    return () => clearTimeout(timer);
  }, [showingScreen]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-6">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Dumbbell className="h-7 w-7" />
          </span>
          <h1 className="text-2xl font-semibold text-foreground">{APP_NAME}</h1>
          <p className="text-muted-foreground">Member self check-in</p>
        </div>

        {!showingScreen && (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border border-border bg-card p-8 shadow-sm"
          >
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              {(
                [
                  { value: "MEMBER_ID", label: "Member ID" },
                  { value: "PHONE", label: "Phone Number" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setMode(opt.value);
                    setIdentifier("");
                    inputRef.current?.focus();
                  }}
                  className={cn(
                    "rounded-md py-2.5 text-sm font-medium transition-colors",
                    mode === opt.value
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <label
              htmlFor="identifier"
              className="block text-center text-lg font-medium text-foreground"
            >
              {mode === "MEMBER_ID" ? "Enter your member ID" : "Enter your phone number"}
            </label>
            <Input
              id="identifier"
              name="identifier"
              ref={inputRef}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoFocus
              autoComplete="off"
              inputMode={mode === "PHONE" ? "tel" : "numeric"}
              placeholder={mode === "MEMBER_ID" ? "12345 (the “MEM-” isn’t needed)" : "9876543210"}
              className="h-14 text-center text-xl"
            />
            <Button
              type="submit"
              className="h-14 w-full text-lg"
              loading={pending}
              disabled={!identifier.trim()}
            >
              Continue
            </Button>
          </form>
        )}

        {error && (
          <div className="space-y-4 rounded-2xl border-2 border-destructive bg-destructive/10 p-8 text-center">
            <XCircle className="mx-auto h-14 w-14 text-destructive" />
            <p className="text-lg font-semibold text-destructive">{error}</p>
            <Button type="button" variant="outline" className="w-full" onClick={reset}>
              Try again
            </Button>
          </div>
        )}

        {pendingCheckout && (
          <div className="space-y-5 rounded-2xl border-2 border-warning bg-card p-8 text-center shadow-sm">
            <Avatar
              name={pendingCheckout.memberName}
              src={pendingCheckout.photoUrl}
              size={88}
              className="mx-auto"
            />
            <div>
              <p className="text-lg font-medium text-foreground">{pendingCheckout.memberName}</p>
              <p className="text-sm text-muted-foreground">{pendingCheckout.memberCode}</p>
              <p className="mt-3 text-base text-foreground">
                You checked in at {formatTime(pendingCheckout.checkInAt)}. Check out now?
              </p>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="h-12 flex-1" onClick={reset}>
                Not now
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="h-12 flex-1"
                loading={pending}
                onClick={confirmCheckOut}
              >
                Check out
              </Button>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-5 rounded-2xl border-2 border-success bg-card p-8 text-center shadow-sm">
            <Avatar name={result.memberName} src={result.photoUrl} size={88} className="mx-auto" />
            <div>
              <p className="flex items-center justify-center gap-2 text-xl font-semibold text-success">
                {result.action === "IN" ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <LogOutIcon className="h-6 w-6" />
                )}
                {result.action === "IN" ? "Checked in" : "Checked out"}
              </p>
              <p className="mt-1 text-lg font-medium text-foreground">{result.memberName}</p>
              <p className="text-sm text-muted-foreground">{result.memberCode}</p>
            </div>

            <MembershipCard info={result} />

            <Button type="button" className="w-full" onClick={reset}>
              Done
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
