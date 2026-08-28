"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  updateWorkoutPlanAction,
  deleteWorkoutPlanAction,
  addWorkoutExerciseAction,
  updateWorkoutExerciseAction,
  removeWorkoutExerciseAction,
} from "@/lib/actions/workouts";
import { initialActionState } from "@/lib/actions/types";
import { useActionToast } from "@/hooks/use-action-toast";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { WORKOUT_STATUSES, DAYS_OF_WEEK } from "@/lib/constants";
import { formatDate, titleCase } from "@/lib/utils";

type PlanDetail = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string;
  endDate: string | null;
  memberName: string;
  trainerName: string;
};

type ExerciseEntry = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  dayOfWeek: number;
  sets: number | null;
  reps: string | null;
  weight: string | null;
  restSeconds: number | null;
  durationMinutes: number | null;
  order: number;
  notes: string | null;
};

type ExerciseOption = { id: string; name: string };

export function WorkoutPlanDetail({
  plan,
  exercises,
  exerciseLibrary,
  canEdit,
}: {
  plan: PlanDetail;
  exercises: ExerciseEntry[];
  exerciseLibrary: ExerciseOption[];
  canEdit: boolean;
}) {
  const editPlanRef = useRef<DialogHandle>(null);
  const entryDialogRef = useRef<DialogHandle>(null);
  const [editingEntry, setEditingEntry] = useState<ExerciseEntry | null>(null);
  // Bumped on every dialog open to force a fresh mount, so a previous submission's
  // field values / success state never leak into the next add/edit.
  const [planNonce, setPlanNonce] = useState(0);
  const [entryNonce, setEntryNonce] = useState(0);
  const router = useRouter();
  const { toast } = useToast();

  function openEditPlan() {
    setPlanNonce((n) => n + 1);
    editPlanRef.current?.open();
  }

  function openAddEntry() {
    setEditingEntry(null);
    setEntryNonce((n) => n + 1);
    entryDialogRef.current?.open();
  }

  function openEditEntry(entry: ExerciseEntry) {
    setEditingEntry(entry);
    setEntryNonce((n) => n + 1);
    entryDialogRef.current?.open();
  }

  async function handleDeletePlan() {
    const fd = new FormData();
    fd.set("id", plan.id);
    const result = await deleteWorkoutPlanAction(initialActionState, fd);
    if (result?.error) {
      toast({ title: "Couldn't delete plan", description: result.error, variant: "error" });
    }
  }

  async function handleRemoveEntry(entryId: string) {
    const fd = new FormData();
    fd.set("id", entryId);
    fd.set("workoutPlanId", plan.id);
    const result = await removeWorkoutExerciseAction(initialActionState, fd);
    if (result.error) {
      toast({ title: "Couldn't remove exercise", description: result.error, variant: "error" });
    } else {
      router.refresh();
    }
  }

  const byDay = new Map<number, ExerciseEntry[]>();
  for (const entry of exercises) {
    const list = byDay.get(entry.dayOfWeek) ?? [];
    list.push(entry);
    byDay.set(entry.dayOfWeek, list);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Plan details</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {plan.memberName} · Trainer {plan.trainerName}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={plan.status} />
              {canEdit && (
                <>
                  <Button variant="outline" size="sm" onClick={openEditPlan}>
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                  <ConfirmDialog
                    trigger={(open) => (
                      <Button variant="destructive" size="sm" onClick={open}>
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    )}
                    title="Delete workout plan?"
                    description={`"${plan.name}" and all of its exercises will be permanently deleted.`}
                    onConfirm={handleDeletePlan}
                  />
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Start date</p>
            <p className="mt-1 text-sm text-foreground">{formatDate(plan.startDate)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">End date</p>
            <p className="mt-1 text-sm text-foreground">{plan.endDate ? formatDate(plan.endDate) : "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</p>
            <p className="mt-1 text-sm text-foreground">{plan.description ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Weekly schedule</h2>
        {canEdit && (
          <Button size="sm" onClick={openAddEntry}>
            <Plus className="h-4 w-4" />
            Add exercise
          </Button>
        )}
      </div>

      {exercises.length === 0 ? (
        <EmptyState
          title="No exercises scheduled yet"
          description={canEdit ? "Add exercises to build out this plan's weekly schedule." : "This plan has no exercises yet."}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {DAYS_OF_WEEK.map((dayLabel, dayIndex) => {
            const entries = (byDay.get(dayIndex) ?? []).sort((a, b) => a.order - b.order);
            if (entries.length === 0) return null;
            return (
              <Card key={dayIndex}>
                <CardHeader>
                  <CardTitle>{dayLabel}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{entry.exerciseName}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {[
                            entry.sets ? `${entry.sets} sets` : null,
                            entry.reps ? `${entry.reps} reps` : null,
                            entry.weight,
                            entry.restSeconds ? `Rest ${entry.restSeconds}s` : null,
                            entry.durationMinutes ? `${entry.durationMinutes} min` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "No details"}
                        </p>
                        {entry.notes && <p className="mt-1 text-xs text-muted-foreground">{entry.notes}</p>}
                      </div>
                      {canEdit && (
                        <div className="flex shrink-0 items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditEntry(entry)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <ConfirmDialog
                            trigger={(open) => (
                              <Button variant="ghost" size="icon" onClick={open}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                            title="Remove exercise?"
                            description={`"${entry.exerciseName}" will be removed from ${dayLabel}.`}
                            onConfirm={() => handleRemoveEntry(entry.id)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {canEdit && (
        <>
          <EditPlanDialog key={`plan-${planNonce}`} ref={editPlanRef} plan={plan} />
          <ExerciseEntryDialog
            key={`entry-${editingEntry?.id ?? "new"}-${entryNonce}`}
            ref={entryDialogRef}
            workoutPlanId={plan.id}
            entry={editingEntry}
            exerciseLibrary={exerciseLibrary}
          />
        </>
      )}
    </div>
  );
}

function EditPlanDialog({ ref, plan }: { ref: React.RefObject<DialogHandle | null>; plan: PlanDetail }) {
  const [state, formAction, pending] = useActionState(updateWorkoutPlanAction, initialActionState);
  useActionToast(state);

  useEffect(() => {
    if (state.success) ref.current?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog ref={ref} title="Edit plan details">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="id" value={plan.id} />
        <Field label="Plan name" htmlFor="name" required error={state.fieldErrors?.name}>
          <Input id="name" name="name" defaultValue={plan.name} invalid={!!state.fieldErrors?.name} />
        </Field>
        <Field label="Description" htmlFor="description" error={state.fieldErrors?.description}>
          <Textarea id="description" name="description" defaultValue={plan.description ?? ""} rows={2} />
        </Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Start date" htmlFor="startDate" required error={state.fieldErrors?.startDate}>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={plan.startDate.slice(0, 10)}
              invalid={!!state.fieldErrors?.startDate}
            />
          </Field>
          <Field label="End date" htmlFor="endDate" error={state.fieldErrors?.endDate}>
            <Input id="endDate" name="endDate" type="date" defaultValue={plan.endDate ? plan.endDate.slice(0, 10) : ""} />
          </Field>
          <Field label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue={plan.status}>
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
            Save changes
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function ExerciseEntryDialog({
  ref,
  workoutPlanId,
  entry,
  exerciseLibrary,
}: {
  ref: React.RefObject<DialogHandle | null>;
  workoutPlanId: string;
  entry: ExerciseEntry | null;
  exerciseLibrary: ExerciseOption[];
}) {
  const action = entry ? updateWorkoutExerciseAction : addWorkoutExerciseAction;
  const [state, formAction, pending] = useActionState(action, initialActionState);
  useActionToast(state);

  useEffect(() => {
    if (state.success) ref.current?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog ref={ref} title={entry ? "Edit exercise" : "Add exercise"}>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="workoutPlanId" value={workoutPlanId} />
        {entry && <input type="hidden" name="id" value={entry.id} />}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Exercise" htmlFor="exerciseId" required error={state.fieldErrors?.exerciseId}>
            <Select
              id="exerciseId"
              name="exerciseId"
              defaultValue={entry?.exerciseId ?? ""}
              invalid={!!state.fieldErrors?.exerciseId}
            >
              <option value="" disabled>
                Select exercise
              </option>
              {exerciseLibrary.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Day" htmlFor="dayOfWeek" required error={state.fieldErrors?.dayOfWeek}>
            <Select id="dayOfWeek" name="dayOfWeek" defaultValue={entry?.dayOfWeek ?? 0}>
              {DAYS_OF_WEEK.map((day, index) => (
                <option key={day} value={index}>
                  {day}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Sets" htmlFor="sets" error={state.fieldErrors?.sets}>
            <Input id="sets" name="sets" type="number" min={0} defaultValue={entry?.sets ?? ""} />
          </Field>
          <Field label="Reps" htmlFor="reps" hint='e.g. "8-10"' error={state.fieldErrors?.reps}>
            <Input id="reps" name="reps" defaultValue={entry?.reps ?? ""} />
          </Field>
          <Field label="Weight" htmlFor="weight" hint='e.g. "40kg"' error={state.fieldErrors?.weight}>
            <Input id="weight" name="weight" defaultValue={entry?.weight ?? ""} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Rest (seconds)" htmlFor="restSeconds" error={state.fieldErrors?.restSeconds}>
            <Input id="restSeconds" name="restSeconds" type="number" min={0} defaultValue={entry?.restSeconds ?? ""} />
          </Field>
          <Field label="Duration (min)" htmlFor="durationMinutes" error={state.fieldErrors?.durationMinutes}>
            <Input
              id="durationMinutes"
              name="durationMinutes"
              type="number"
              min={0}
              defaultValue={entry?.durationMinutes ?? ""}
            />
          </Field>
          <Field label="Order" htmlFor="order" error={state.fieldErrors?.order}>
            <Input id="order" name="order" type="number" min={0} defaultValue={entry?.order ?? 0} />
          </Field>
        </div>
        <Field label="Notes" htmlFor="notes" error={state.fieldErrors?.notes}>
          <Textarea id="notes" name="notes" defaultValue={entry?.notes ?? ""} rows={2} />
        </Field>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => ref.current?.close()}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            {entry ? "Save changes" : "Add exercise"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
