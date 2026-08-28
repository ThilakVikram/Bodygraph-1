"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { Dumbbell, Plus } from "lucide-react";
import { createWorkoutPlanAction } from "@/lib/actions/workouts";
import { initialActionState } from "@/lib/actions/types";
import { useActionToast } from "@/hooks/use-action-toast";
import { Button } from "@/components/ui/button";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { WORKOUT_STATUSES } from "@/lib/constants";
import { formatDate, titleCase } from "@/lib/utils";
import type { SearchParams } from "@/lib/pagination";
import { StatusFilter } from "./status-filter";

type PlanRow = {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string | null;
  memberName: string;
  trainerName: string;
};

type Option = { id: string; name: string };

export function WorkoutPlansClient({
  plans,
  searchParams,
  page,
  pageSize,
  total,
  canCreate,
  isAdmin,
  members,
  trainers,
}: {
  plans: PlanRow[];
  searchParams: SearchParams;
  page: number;
  pageSize: number;
  total: number;
  canCreate: boolean;
  isAdmin: boolean;
  members: Option[];
  trainers: Option[];
}) {
  const dialogRef = useRef<DialogHandle>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput placeholder="Search plans or members…" />
          <StatusFilter />
        </div>
        {canCreate && (
          <Button onClick={() => dialogRef.current?.open()}>
            <Plus className="h-4 w-4" />
            New Plan
          </Button>
        )}
      </div>

      {plans.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="No workout plans found"
          description={
            canCreate
              ? "Create a workout plan to get started."
              : "No workout plans have been assigned yet."
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan</TableHead>
              <TableHead>Member</TableHead>
              <TableHead>Trainer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell>
                  <Link href={`/workouts/${plan.id}`} className="font-medium text-foreground hover:underline">
                    {plan.name}
                  </Link>
                </TableCell>
                <TableCell>{plan.memberName}</TableCell>
                <TableCell>{plan.trainerName}</TableCell>
                <TableCell>
                  <StatusBadge status={plan.status} />
                </TableCell>
                <TableCell>{formatDate(plan.startDate)}</TableCell>
                <TableCell>{plan.endDate ? formatDate(plan.endDate) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Pagination
        basePath="/workouts"
        searchParams={searchParams}
        page={page}
        pageSize={pageSize}
        total={total}
      />

      {canCreate && (
        <NewPlanDialog ref={dialogRef} members={members} trainers={trainers} isAdmin={isAdmin} />
      )}
    </div>
  );
}

function NewPlanDialog({
  ref,
  members,
  trainers,
  isAdmin,
}: {
  ref: React.RefObject<DialogHandle | null>;
  members: Option[];
  trainers: Option[];
  isAdmin: boolean;
}) {
  const [state, formAction, pending] = useActionState(createWorkoutPlanAction, initialActionState);
  useActionToast(state);

  return (
    <Dialog ref={ref} title="New workout plan" description="Assign a workout program to a member.">
      <form action={formAction} className="space-y-4">
        <Field label="Plan name" htmlFor="name" required error={state.fieldErrors?.name}>
          <Input id="name" name="name" invalid={!!state.fieldErrors?.name} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Member" htmlFor="memberId" required error={state.fieldErrors?.memberId}>
            <Select id="memberId" name="memberId" defaultValue="" invalid={!!state.fieldErrors?.memberId}>
              <option value="" disabled>
                Select member
              </option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
          {isAdmin && (
            <Field label="Trainer" htmlFor="trainerId" required error={state.fieldErrors?.trainerId}>
              <Select id="trainerId" name="trainerId" defaultValue="" invalid={!!state.fieldErrors?.trainerId}>
                <option value="" disabled>
                  Select trainer
                </option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>
        <Field label="Description" htmlFor="description" error={state.fieldErrors?.description}>
          <Textarea id="description" name="description" rows={2} />
        </Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Start date" htmlFor="startDate" required error={state.fieldErrors?.startDate}>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              invalid={!!state.fieldErrors?.startDate}
            />
          </Field>
          <Field label="End date" htmlFor="endDate" error={state.fieldErrors?.endDate}>
            <Input id="endDate" name="endDate" type="date" />
          </Field>
          <Field label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue="ACTIVE">
              {WORKOUT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => ref.current?.close()}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            Create plan
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
