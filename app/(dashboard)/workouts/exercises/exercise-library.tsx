"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Dumbbell, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createExerciseAction,
  updateExerciseAction,
  deleteExerciseAction,
} from "@/lib/actions/exercises";
import { initialActionState } from "@/lib/actions/types";
import { useActionToast } from "@/hooks/use-action-toast";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { SearchParams } from "@/lib/pagination";

type ExerciseRow = {
  id: string;
  name: string;
  category: string | null;
  muscleGroup: string | null;
  description: string | null;
  instructions: string | null;
  mediaUrl: string | null;
  usageCount: number;
};

export function ExerciseLibrary({
  exercises,
  searchParams,
  page,
  pageSize,
  total,
}: {
  exercises: ExerciseRow[];
  searchParams: SearchParams;
  page: number;
  pageSize: number;
  total: number;
}) {
  const [editing, setEditing] = useState<ExerciseRow | null>(null);
  // Bumped on every "New Exercise" click to force a fresh mount, so a previous
  // submission's field values / success state never leak into the next one.
  const [addKey, setAddKey] = useState(0);
  const addDialogRef = useRef<DialogHandle>(null);
  const editDialogRef = useRef<DialogHandle>(null);
  const { toast } = useToast();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchInput placeholder="Search exercises…" />
        <Button
          onClick={() => {
            setAddKey((k) => k + 1);
            addDialogRef.current?.open();
          }}
        >
          <Plus className="h-4 w-4" />
          New Exercise
        </Button>
      </div>

      {exercises.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="No exercises found"
          description="Add exercises to the shared library so they can be used in workout plans."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Muscle group</TableHead>
              <TableHead>Used in plans</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {exercises.map((exercise) => (
              <TableRow key={exercise.id}>
                <TableCell className="font-medium">{exercise.name}</TableCell>
                <TableCell>{exercise.category ?? "—"}</TableCell>
                <TableCell>{exercise.muscleGroup ?? "—"}</TableCell>
                <TableCell>{exercise.usageCount}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(exercise);
                        editDialogRef.current?.open();
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <ConfirmDialog
                      trigger={(open) => (
                        <Button variant="ghost" size="icon" onClick={open}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                      title="Delete exercise?"
                      description={`"${exercise.name}" will be permanently removed from the library.`}
                      onConfirm={async () => {
                        const fd = new FormData();
                        fd.set("id", exercise.id);
                        const result = await deleteExerciseAction(initialActionState, fd);
                        if (result.error) {
                          toast({ title: "Couldn't delete exercise", description: result.error, variant: "error" });
                        } else if (result.message) {
                          toast({ title: "Success", description: result.message, variant: "success" });
                        }
                      }}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Pagination
        basePath="/workouts/exercises"
        searchParams={searchParams}
        page={page}
        pageSize={pageSize}
        total={total}
      />

      <ExerciseFormDialog key={`add-${addKey}`} ref={addDialogRef} mode="create" />
      {editing && (
        <ExerciseFormDialog
          key={editing.id}
          ref={editDialogRef}
          mode="edit"
          exercise={editing}
          onDone={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function ExerciseFormDialog({
  ref,
  mode,
  exercise,
  onDone,
}: {
  ref: React.RefObject<DialogHandle | null>;
  mode: "create" | "edit";
  exercise?: ExerciseRow;
  onDone?: () => void;
}) {
  const action = mode === "create" ? createExerciseAction : updateExerciseAction;
  const [state, formAction, pending] = useActionState(action, initialActionState);
  useActionToast(state);

  useEffect(() => {
    if (state.success) {
      ref.current?.close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog
      ref={ref}
      title={mode === "create" ? "New exercise" : "Edit exercise"}
      description="Exercises are shared across all trainers."
      onClose={onDone}
    >
      <form action={formAction} className="space-y-4">
        {mode === "edit" && exercise && <input type="hidden" name="id" value={exercise.id} />}
        <Field label="Name" htmlFor="name" required error={state.fieldErrors?.name}>
          <Input id="name" name="name" defaultValue={exercise?.name} invalid={!!state.fieldErrors?.name} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Category" htmlFor="category" error={state.fieldErrors?.category}>
            <Input id="category" name="category" defaultValue={exercise?.category ?? ""} placeholder="e.g. Strength" />
          </Field>
          <Field label="Muscle group" htmlFor="muscleGroup" error={state.fieldErrors?.muscleGroup}>
            <Input id="muscleGroup" name="muscleGroup" defaultValue={exercise?.muscleGroup ?? ""} placeholder="e.g. Chest" />
          </Field>
        </div>
        <Field label="Media URL" htmlFor="mediaUrl" hint="Optional link to a demo image or video." error={state.fieldErrors?.mediaUrl}>
          <Input id="mediaUrl" name="mediaUrl" defaultValue={exercise?.mediaUrl ?? ""} placeholder="https://…" />
        </Field>
        <Field label="Description" htmlFor="description" error={state.fieldErrors?.description}>
          <Textarea id="description" name="description" defaultValue={exercise?.description ?? ""} rows={2} />
        </Field>
        <Field label="Instructions" htmlFor="instructions" error={state.fieldErrors?.instructions}>
          <Textarea id="instructions" name="instructions" defaultValue={exercise?.instructions ?? ""} rows={3} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => ref.current?.close()}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            {mode === "create" ? "Add exercise" : "Save changes"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
