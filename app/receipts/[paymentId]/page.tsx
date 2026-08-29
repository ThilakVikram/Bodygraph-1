import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { APP_NAME } from "@/lib/constants";
import { getCurrency } from "@/lib/settings";
import { formatCurrency, formatDate, formatDateTime, titleCase } from "@/lib/utils";
import { PrintButton } from "./print-button";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const user = await requireUser();
  const { paymentId } = await params;
  const currency = await getCurrency();

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      member: { include: { user: true } },
      membership: { include: { plan: true } },
      recordedBy: true,
    },
  });

  if (!payment) notFound();

  const isStaff = user.role === "ADMIN" || user.role === "RECEPTIONIST";
  const isOwner = payment.member.userId === user.id;
  if (!isStaff && !isOwner) {
    redirect("/forbidden");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="no-print mb-6 flex items-center justify-between">
        <Link
          href="/payments"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to payments
        </Link>
        <PrintButton />
      </div>

      <div className="rounded-xl border border-border bg-card p-8 text-card-foreground shadow-sm print:border-0 print:shadow-none">
        <div className="flex items-start justify-between border-b border-border pb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">{APP_NAME}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Payment Receipt</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-medium text-foreground">Invoice {payment.invoiceNumber}</p>
            <p className="text-muted-foreground">{formatDate(payment.paymentDate)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Billed to
            </p>
            <p className="mt-1 font-medium text-foreground">{payment.member.user.name}</p>
            <p className="text-sm text-muted-foreground">{payment.member.user.email}</p>
            <p className="text-sm text-muted-foreground">
              Member code: {payment.member.memberCode}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Status
            </p>
            <p className="mt-1 font-medium text-foreground">{titleCase(payment.status)}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Method
            </p>
            <p className="mt-1 font-medium text-foreground">{titleCase(payment.method)}</p>
          </div>
        </div>

        <table className="w-full border-t border-border text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-3 font-semibold">Description</th>
              <th className="py-3 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="py-3 align-top text-foreground">
                {payment.membership ? `${payment.membership.plan.name} membership` : "Payment"}
                {payment.notes && (
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {payment.notes}
                  </span>
                )}
              </td>
              <td className="py-3 text-right text-foreground">{formatCurrency(payment.amount, currency)}</td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-end pt-4">
          <div className="w-48">
            <div className="flex justify-between border-t border-border pt-3 text-base font-semibold text-foreground">
              <span>Total</span>
              <span>{formatCurrency(payment.amount, currency)}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
          <p>
            Recorded by {payment.recordedBy?.name ?? "system"} on{" "}
            {formatDateTime(payment.createdAt)}.
          </p>
          <p className="mt-1">Thank you for choosing {APP_NAME}.</p>
        </div>
      </div>
    </div>
  );
}
